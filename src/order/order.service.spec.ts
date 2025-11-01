import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction, TransactionType } from '../wallet/entities/wallet-transaction.entity';
import { ProductService } from '../product/product.service';
import { TransactionLoggerService } from '../shared/services/transaction-logger.service';
import { CacheService } from '../shared/services/cache.service';
import { StripeService } from '../payment/services/stripe.service';
import { WalletService } from '../wallet/wallet.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentMethod, OrderStatus, TransactionActionType } from '../shared/enums';
import { v4 as uuidv4 } from 'uuid';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: any;
  let productRepository: any;
  let userRepository: any;
  let walletRepository: any;
  let walletTransactionRepository: any;
  let productService: ProductService;
  let transactionLogger: TransactionLoggerService;
  let cacheService: CacheService;
  let stripeService: StripeService;
  let walletService: WalletService;
  let configService: ConfigService;
  let sequelize: any;

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    price: 50.00,
    availableUnits: 10,
    merchant_id: 'merchant-1',
  };

  const mockOrder = {
    id: 'order-1',
    user_id: 'user-1',
    product_id: 'product-1',
    quantity: 1,
    total_amount: 50.00,
    payment_method: PaymentMethod.WALLET,
    status: OrderStatus.PENDING,
    save: jest.fn(),
    update: jest.fn(),
    reload: jest.fn(),
  };

  const mockWallet = {
    id: 'wallet-1',
    user_id: 'user-1',
    balance: 10000, // $100.00 in cents
    save: jest.fn(),
  };

  beforeEach(async () => {
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
      LOCK: { UPDATE: 'UPDATE' },
    };

    sequelize = {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    orderRepository = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      sequelize,
    };

    productRepository = {
      findByPk: jest.fn(),
    };

    userRepository = {
      findByPk: jest.fn(),
    };

    walletRepository = {
      findOne: jest.fn(),
      sequelize,
    };

    walletTransactionRepository = {
      create: jest.fn(),
    };

    productService = {
      decreaseStock: jest.fn(),
    } as any;

    transactionLogger = {
      logOrder: jest.fn(),
      logWallet: jest.fn(),
      logProduct: jest.fn(),
    } as any;

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    } as any;

    stripeService = {
      createCheckoutSession: jest.fn(),
      retrieveCheckoutSession: jest.fn(),
    } as any;

    walletService = {
      deposit: jest.fn(),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getModelToken(Order),
          useValue: orderRepository,
        },
        {
          provide: getModelToken(Product),
          useValue: productRepository,
        },
        {
          provide: getModelToken(User),
          useValue: userRepository,
        },
        {
          provide: getModelToken(Wallet),
          useValue: walletRepository,
        },
        {
          provide: getModelToken(WalletTransaction),
          useValue: walletTransactionRepository,
        },
        {
          provide: ProductService,
          useValue: productService,
        },
        {
          provide: TransactionLoggerService,
          useValue: transactionLogger,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
        {
          provide: StripeService,
          useValue: stripeService,
        },
        {
          provide: WalletService,
          useValue: walletService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create - Wallet Payment', () => {
    const createOrderDto: CreateOrderDto = {
      productId: 'product-1',
      paymentMethod: PaymentMethod.WALLET,
    };

    it('should successfully create order with wallet payment', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      productRepository.findByPk = jest.fn().mockResolvedValue(mockProduct);
      orderRepository.create = jest.fn().mockResolvedValue(mockOrder);
      walletRepository.findOne = jest.fn().mockResolvedValue(mockWallet);
      walletTransactionRepository.create = jest.fn().mockResolvedValue({
        id: 'tx-1',
        type: TransactionType.PURCHASE,
        amount: 5000,
      });

      mockWallet.balance = 10000;
      mockOrder.status = OrderStatus.PENDING;

      const result = await service.create(createOrderDto, 'user-1', '127.0.0.1');

      expect(result).toBeDefined();
      expect(productService.decreaseStock).toHaveBeenCalledWith('product-1', 1);
      expect(mockOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.COMPLETED }),
        { transaction: mockTx },
      );
      expect(mockTx.commit).to ставHaveBeenCalled();
      expect(transactionLogger.logOrder).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      productRepository.findByPk = jest.fn().mockResolvedValue(null);

      await expect(service.create(createOrderDto, 'user-1')).rejects.toThrow(NotFoundException);
      expect(mockTx.rollback).toHaveBeenCalled();
    });

    it('should throw BadRequestException if product is out of stock', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      productRepository.findByPk = jest.fn().mockResolvedValue({
        ...mockProduct,
        availableUnits: 0,
      });

      await expect(service.create(createOrderDto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockTx.rollback).toHaveBeenCalled();
    });

    it('should throw BadRequestException for insufficient wallet balance', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      productRepository.findByPk = jest.fn().mockResolvedValue(mockProduct);
      orderRepository.create = jest.fn().mockResolvedValue(mockOrder);
      walletRepository.findOne = jest.fn().mockResolvedValue({
        ...mockWallet,
        balance: 1000, // Less than order amount
      });

      await expect(service.create(createOrderDto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockTx.rollback).toHaveBeenCalled();
    });
  });

  describe('create - Gateway Payment', () => {
    const createOrderDto: CreateOrderDto = {
      productId: 'product-1',
      paymentMethod: PaymentMethod.GATEWAY,
    };

    it('should create order with Stripe checkout session', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      productRepository.findByPk = jest.fn().mockResolvedValue(mockProduct);
      orderRepository.create = jest.fn().mockResolvedValue(mockOrder);
      
      const mockCheckoutSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };
      stripeService.createCheckoutSession = jest.fn().mockResolvedValue(mockCheckoutSession);

      const result = await service.create(createOrderDto, 'user-1', '127.0.0.1');

      expect(result).toBeDefined();
      expect(stripeService.createCheckoutSession).toHaveBeenCalled();
      expect(mockOrder.stripe_session_id).toBe('cs_test_123');
      expect(mockOrder.save).toHaveBeenCalled();
      expect((result as any).paymentSessionUrl).toBe(mockCheckoutSession.url);
      expect(mockTx.commit).toHaveBeenCalled();
      expect(transactionLogger.logOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: TransactionActionType.GATEWAY_PAYMENT_INITIATED,
        }),
      );
    });
  });

  describe('handleStripeWebhook', () => {
    it('should complete order after successful payment', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      const orderWithProduct = {
        ...mockOrder,
        status: OrderStatus.PENDING,
        stripe_session_id: 'cs_test_123',
        product: mockProduct,
      };

      orderRepository.findOne = jest.fn().mockResolvedValue(orderWithProduct);
      stripeService.retrieveCheckoutSession = jest.fn().mockResolvedValue({
        id: 'cs_test_123',
        payment_status: 'paid',
        payment_intent: 'pi_test_123',
      });
      productRepository.findByPk = jest.fn().mockResolvedValue(mockProduct);

      const result = await service.handleStripeWebhook('cs_test_123');

      expect(result).toBeDefined();
      expect(productService.decreaseStock).toHaveBeenCalled();
      expect(orderWithProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.COMPLETED }),
        { transaction: mockTx },
      );
      expect(walletService.deposit).toHaveBeenCalled();
      expect(mockTx.commit).toHaveBeenCalled();
    });

    it('should return order if already processed', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      const completedOrder = {
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      };

      orderRepository.findOne = jest.fn().mockResolvedValue(completedOrder);

      const result = await service.handleStripeWebhook('cs_test_123');

      expect(result).toEqual(completedOrder);
      expect(productService.decreaseStock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if order not found', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      orderRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.handleStripeWebhook('cs_test_123')).rejects.toThrow(NotFoundException);
      expect(mockTx.rollback).toHaveBeenCalled();
    });

    it('should throw BadRequestException if payment not completed', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      orderRepository.findOne = jest.fn().mockResolvedValue(mockOrder);
      stripeService.retrieveCheckoutSession = jest.fn().mockResolvedValue({
        id: 'cs_test_123',
        payment_status: 'unpaid',
      });

      await expect(service.handleStripeWebhook('cs_test_123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return order by id', async () => {
      orderRepository.findByPk = jest.fn().mockResolvedValue(mockOrder);

      const result = await service.findOne('order-1');

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findByPk).toHaveBeenCalledWith('order-1');
    });

    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findByPk = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});

