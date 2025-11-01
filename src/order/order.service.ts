import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize, Transaction as SequelizeTransaction } from 'sequelize';
import { Order } from './entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction, TransactionType } from '../wallet/entities/wallet-transaction.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymentMethod, OrderStatus, TransactionActionType } from '../shared/enums';
import { ProductService } from '../product/product.service';
import { TransactionLoggerService } from '../shared/services/transaction-logger.service';
import { CacheService } from '../shared/services/cache.service';
import { StripeService } from '../payment/services/stripe.service';
import { WalletService } from '../wallet/wallet.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrderService {
  private readonly ORDERS_USER_TTL = 180; // 3 minutes

  constructor(
    @InjectModel(Order)
    private orderRepository: typeof Order,
    @InjectModel(Product)
    private productRepository: typeof Product,
    @InjectModel(User)
    private userRepository: typeof User,
    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,
    @InjectModel(WalletTransaction)
    private walletTransactionRepository: typeof WalletTransaction,
    private productService: ProductService,
    private transactionLogger: TransactionLoggerService,
    private cacheService: CacheService,
    private stripeService: StripeService,
    private walletService: WalletService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new order with purchase flow
   */
  async create(
    createOrderDto: CreateOrderDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Order> {
    let transaction: SequelizeTransaction | null = null;

    try {
      transaction = await this.orderRepository.sequelize!.transaction();

      // Get and validate product
      const product = await this.productRepository.findByPk(createOrderDto.productId, {
        transaction,
      });

      if (!product) {
        await transaction.rollback();
        throw new NotFoundException(`Product with ID ${createOrderDto.productId} not found`);
      }

      // Check if product is purchasable
      if (product.availableUnits <= 0) {
        await transaction.rollback();
        throw new BadRequestException('Product is out of stock');
      }

      // Calculate total amount (quantity is always 1 for now)
      const quantity = 1;
      const totalAmount = Number(product.price) * quantity;

      // Create order
      const order = await this.orderRepository.create(
        {
          user_id: userId,
          product_id: createOrderDto.productId,
          quantity,
          total_amount: totalAmount,
          payment_method: createOrderDto.paymentMethod,
          status: OrderStatus.PENDING,
        } as any,
        { transaction },
      );

      // Log order creation
      await this.transactionLogger.logOrder({
        userId,
        orderId: order.id,
        actionType: TransactionActionType.ORDER_CREATED,
        status: 'pending',
        details: {
          productId: product.id,
          productName: product.name,
          totalAmount,
          paymentMethod: createOrderDto.paymentMethod,
        },
        ipAddress,
      });

      // Process payment based on method
      if (createOrderDto.paymentMethod === PaymentMethod.WALLET) {
        await this.processWalletPayment(order, userId, transaction, ipAddress);
      } else if (createOrderDto.paymentMethod === PaymentMethod.GATEWAY) {
        // Create Stripe checkout session
        const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        const successUrl = `${baseUrl}/orders/${order.id}/success`;
        const cancelUrl = `${baseUrl}/orders/${order.id}/cancel`;

        const checkoutSession = await this.stripeService.createCheckoutSession(
          order.id,
          totalAmount,
          'usd',
          {
            productId: product.id,
            productName: product.name,
            userId,
          },
          successUrl,
          cancelUrl,
        );

        // Store Stripe session ID in order
        order.stripe_session_id = checkoutSession.id;
        order.gateway_transaction_id = checkoutSession.id;
        await order.save({ transaction });

        // Log payment initiation
        await this.transactionLogger.logOrder({
          userId,
          orderId: order.id,
          actionType: TransactionActionType.GATEWAY_PAYMENT_INITIATED,
          status: 'pending',
          details: {
            stripeSessionId: checkoutSession.id,
            amount: totalAmount,
          },
          ipAddress,
        });

        await transaction.commit();
        
        // Attach payment URL to order object for response
        (order as any).paymentSessionUrl = checkoutSession.url;
        
        return order;
      }

      await transaction.commit();
      
      // Invalidate caches
      await Promise.all([
        this.cacheService.delete(CacheService.getOrdersUserKey(userId)),
        // Invalidate wallet balance cache if wallet payment was used
        createOrderDto.paymentMethod === PaymentMethod.WALLET
          ? this.cacheService.delete(CacheService.getWalletBalanceKey(userId))
          : Promise.resolve(),
      ]);
      
      return order;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create order');
    }
  }

  /**
   * Process wallet payment for an order
   */
  private async processWalletPayment(
    order: Order,
    userId: string,
    transaction: SequelizeTransaction,
    ipAddress?: string,
  ): Promise<void> {
    const amountInCents = Math.round(Number(order.total_amount) * 100);

    // Get or create wallet and lock it
    let wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
      lock: SequelizeTransaction.LOCK.UPDATE,
      transaction,
    });

    if (!wallet) {
      wallet = await this.walletRepository.create(
        {
          user_id: userId,
          balance: 0,
        } as any,
        { transaction },
      );
    }

    // Check sufficient balance
    if (wallet.balance < amountInCents) {
      // Update order status to failed
      await order.update(
        { status: OrderStatus.FAILED } as any,
        { transaction },
      );

      // Log failure
      await this.transactionLogger.logOrder({
        userId,
        orderId: order.id,
        actionType: TransactionActionType.ORDER_FAILED,
        status: 'failed',
        details: {
          reason: 'Insufficient wallet balance',
          requiredAmount: order.total_amount,
        },
        errorMessage: 'Insufficient wallet balance',
        ipAddress,
      });

      throw new BadRequestException('Insufficient wallet balance');
    }

    // Record balance before
    const balanceBefore = wallet.balance;

    // Deduct from wallet
    wallet.balance -= amountInCents;
    await wallet.save({ transaction });

    // Create wallet transaction record
    const idempotencyKey = `order_${order.id}_${Date.now()}`;
    const walletTransaction = await this.walletTransactionRepository.create(
      {
        wallet_id: wallet.id,
        type: TransactionType.PURCHASE,
        amount: amountInCents,
        balance_before: balanceBefore,
        balance_after: wallet.balance,
        idempotency_key: idempotencyKey,
        description: `Purchase: ${order.product_id}`,
        metadata: { orderId: order.id, productId: order.product_id },
      } as any,
      { transaction },
    );

    // Log wallet purchase
    await this.transactionLogger.logWallet({
      userId,
      walletTransactionId: walletTransaction.id,
      actionType: TransactionActionType.WALLET_PURCHASE,
      status: 'success',
      details: {
        orderId: order.id,
        amount: order.total_amount,
      },
      ipAddress,
    });

    // Decrease product stock
    await this.productService.decreaseStock(order.product_id, order.quantity);
    await this.transactionLogger.logProduct({
      userId,
      productId: order.product_id,
      actionType: TransactionActionType.PRODUCT_STOCK_DECREASED,
      status: 'success',
      details: {
        orderId: order.id,
        quantity: order.quantity,
      },
      ipAddress,
    });

    // Update order status to completed
    await order.update(
      { status: OrderStatus.COMPLETED } as any,
      { transaction },
    );

    // Log order completion
    await this.transactionLogger.logOrder({
      userId,
      orderId: order.id,
      actionType: TransactionActionType.ORDER_COMPLETED,
      status: 'success',
      details: {
        paymentMethod: PaymentMethod.WALLET,
        walletTransactionId: walletTransaction.id,
      },
      ipAddress,
    });
  }

  /**
   * Get all orders (with optional filtering)
   */
  async findAll(userId?: string): Promise<Order[]> {
    const whereClause: any = {};
    if (userId) {
      whereClause.user_id = userId;
    }

    return this.orderRepository.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Product,
          attributes: ['id', 'name', 'price'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get a single order by ID
   */
  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Product,
          attributes: ['id', 'name', 'price', 'availableUnits'],
        },
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  /**
   * Get orders for a specific user
   */
  async findByUserId(userId: string): Promise<Order[]> {
    const cacheKey = CacheService.getOrdersUserKey(userId);
    
    // Try to get from cache
    const cached = await this.cacheService.get<Order[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const orders = await this.orderRepository.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'price'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Store in cache
    await this.cacheService.set(cacheKey, orders, this.ORDERS_USER_TTL * 1000);

    return orders;
  }

  /**
   * Update order status (for gateway payments or admin)
   */
  async updateStatus(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId?: string,
    ipAddress?: string,
  ): Promise<Order> {
    const order = await this.orderRepository.findByPk(id);

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const oldStatus = order.status;

    // Update order
    await order.update(updateOrderDto as any);

    // Log status change
    if (updateOrderDto.status && updateOrderDto.status !== oldStatus) {
      await this.transactionLogger.logOrder({
        userId: userId || order.user_id,
        orderId: order.id,
        actionType: this.getActionTypeForStatus(updateOrderDto.status),
        status: updateOrderDto.status === OrderStatus.COMPLETED ? 'success' : 
                updateOrderDto.status === OrderStatus.FAILED ? 'failed' : 'pending',
        details: {
          oldStatus,
          newStatus: updateOrderDto.status,
        },
        ipAddress,
      });

      // If order is completed and was pending (gateway payment), decrease stock
      if (
        updateOrderDto.status === OrderStatus.COMPLETED &&
        oldStatus === OrderStatus.PENDING &&
        order.payment_method === PaymentMethod.GATEWAY
      ) {
        await this.productService.decreaseStock(order.product_id, order.quantity);
      }
    }

    return order;
  }

  /**
   * Handle Stripe payment webhook - confirm payment and complete order
   */
  async handleStripeWebhook(
    sessionId: string,
    paymentIntentId?: string,
  ): Promise<Order> {
    let transaction: SequelizeTransaction | null = null;

    try {
      transaction = await this.orderRepository.sequelize!.transaction();

      // Find order by Stripe session ID or payment intent ID
      const order = await this.orderRepository.findOne({
        where: paymentIntentId
          ? { stripe_payment_intent_id: paymentIntentId }
          : { stripe_session_id: sessionId },
        include: [{ model: Product, as: 'product' }],
        transaction,
      });

      if (!order) {
        throw new NotFoundException(`Order not found for Stripe session ${sessionId}`);
      }

      // Verify order status is still pending
      if (order.status !== OrderStatus.PENDING) {
        await transaction.commit();
        return order; // Already processed
      }

      // Retrieve payment session from Stripe to verify
      const session = await this.stripeService.retrieveCheckoutSession(sessionId);
      
      if (session.payment_status !== 'paid') {
        throw new BadRequestException('Payment not completed');
      }

      // Store payment intent ID if available
      if (session.payment_intent && typeof session.payment_intent === 'string') {
        order.stripe_payment_intent_id = session.payment_intent;
      } else if (session.payment_intent && typeof session.payment_intent === 'object') {
        order.stripe_payment_intent_id = session.payment_intent.id;
      }

      // Complete the order
      await this.completeGatewayOrder(order, transaction);

      await transaction.commit();
      return order;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * Complete gateway order after payment confirmation
   */
  private async completeGatewayOrder(
    order: Order,
    transaction: SequelizeTransaction,
  ): Promise<void> {
    // Decrease product stock
    await this.productService.decreaseStock(order.product_id, order.quantity);
    await this.transactionLogger.logProduct({
      userId: order.user_id,
      productId: order.product_id,
      actionType: TransactionActionType.PRODUCT_STOCK_DECREASED,
      status: 'success',
      details: {
        orderId: order.id,
        quantity: order.quantity,
      },
    });

    // Update order status to completed
    await order.update(
      { status: OrderStatus.COMPLETED } as any,
      { transaction },
    );

    // Get product to find merchant
    const product = await this.productRepository.findByPk(order.product_id, { transaction });
    if (!product) {
      throw new NotFoundException(`Product ${order.product_id} not found`);
    }

    // Log order completion (within transaction)
    await this.transactionLogger.logOrder({
      userId: order.user_id,
      orderId: order.id,
      actionType: TransactionActionType.ORDER_COMPLETED,
      status: 'success',
      details: {
        paymentMethod: PaymentMethod.GATEWAY,
        stripeSessionId: order.stripe_session_id,
        stripePaymentIntentId: order.stripe_payment_intent_id,
      },
    });

    // Commit transaction (order, stock, logs)
    await transaction.commit();

    // Credit merchant wallet (outside transaction, WalletService has its own transaction)
    await this.creditMerchantWallet(
      product.merchant_id,
      order.total_amount,
      order.id,
      product.id,
    );

    // Invalidate caches (after all operations complete)
    await Promise.all([
      this.cacheService.delete(CacheService.getOrdersUserKey(order.user_id)),
      this.cacheService.delete(CacheService.getWalletBalanceKey(product.merchant_id)),
    ]);
  }

  /**
   * Credit merchant wallet after successful payment
   */
  private async creditMerchantWallet(
    merchantId: string,
    amount: number,
    orderId: string,
    productId: string,
  ): Promise<void> {
    // Use WalletService to deposit funds to merchant
    const idempotencyKey = `order_${orderId}_merchant_${uuidv4()}`;
    
    await this.walletService.deposit(merchantId, {
      amount,
      idempotency_key: idempotencyKey,
    });

    // Log merchant credit transaction (WalletService already logs this)
  }

  /**
   * Get action type for order status
   */
  private getActionTypeForStatus(status: OrderStatus): TransactionActionType {
    switch (status) {
      case OrderStatus.COMPLETED:
        return TransactionActionType.ORDER_COMPLETED;
      case OrderStatus.FAILED:
        return TransactionActionType.ORDER_FAILED;
      case OrderStatus.CANCELLED:
        return TransactionActionType.ORDER_CANCELLED;
      default:
        return TransactionActionType.ORDER_CREATED;
    }
  }
}

