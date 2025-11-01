import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize, Transaction as SequelizeTransaction, Op } from 'sequelize';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction, TransactionType } from './entities/wallet-transaction.entity';
import { User } from '../users/entities/user.entity';
import { DepositWalletDto } from './dto/deposit-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CacheService } from '../shared/services/cache.service';

@Injectable()
export class WalletService {
  private readonly WALLET_BALANCE_TTL = 120; // 2 minutes

  constructor(
    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,
    @InjectModel(WalletTransaction)
    private walletTransactionRepository: typeof WalletTransaction,
    @InjectModel(User)
    private userRepository: typeof User,
    private cacheService: CacheService,
  ) {}

  /**
   * Get or create wallet for a user
   */
  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
      include: [{ model: User, as: 'user' }],
    });

    if (!wallet) {
      wallet = await this.walletRepository.create({
        user_id: userId,
        balance: 0,
      } as any);
    }

    return wallet;
  }

  /**
   * Get current wallet balance
   */
  async getBalance(userId: string): Promise<{ balance: number; user_email: string; user_name: string }> {
    const cacheKey = CacheService.getWalletBalanceKey(userId);
    
    // Try to get from cache
    const cached = await this.cacheService.get<{ balance: number; user_email: string; user_name: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const wallet = await this.getOrCreateWallet(userId);
    const user = await this.userRepository.findByPk(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const balanceData = {
      balance: wallet.balance / 100, // Convert cents to dollars
      user_email: user.email,
      user_name: user.name,
    };

    // Store in cache
    await this.cacheService.set(cacheKey, balanceData, this.WALLET_BALANCE_TTL * 1000);

    return balanceData;
  }

  /**
   * Deposit funds to wallet
   */
  async deposit(userId: string, depositDto: DepositWalletDto): Promise<WalletTransaction> {
    const amountInCents = Math.round(depositDto.amount * 100); // Convert dollars to cents

    // Validate amount
    if (amountInCents <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    let transaction: SequelizeTransaction | null = null;

    try {
      transaction = await this.walletRepository.sequelize!.transaction();

      // Check for existing transaction with same idempotency key
      const existingTransaction = await this.walletTransactionRepository.findOne({
        where: { idempotency_key: depositDto.idempotency_key },
        transaction,
      });

      if (existingTransaction) {
        await transaction.rollback();
        
        // Verify the idempotency key parameters match
        if (
          existingTransaction.amount !== amountInCents ||
          existingTransaction.type !== TransactionType.DEPOSIT
        ) {
          throw new ConflictException('Idempotency key already used with different parameters');
        }

        return existingTransaction;
      }

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

      // Record balance before
      const balanceBefore = wallet.balance;

      // Update balance
      wallet.balance += amountInCents;
      await wallet.save({ transaction });

      // Create transaction record
      const walletTransaction = await this.walletTransactionRepository.create(
        {
          wallet_id: wallet.id,
          type: TransactionType.DEPOSIT,
          amount: amountInCents,
          balance_before: balanceBefore,
          balance_after: wallet.balance,
          idempotency_key: depositDto.idempotency_key,
          description: `Deposit of $${depositDto.amount.toFixed(2)}`,
          metadata: { userId, amount: depositDto.amount },
        } as any,
        { transaction },
      );

      await transaction.commit();
      
      // Invalidate wallet balance cache
      await this.cacheService.delete(CacheService.getWalletBalanceKey(userId));
      
      return walletTransaction;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to process deposit');
    }
  }

  /**
   * Withdraw funds from wallet
   */
  async withdraw(userId: string, withdrawDto: WithdrawWalletDto): Promise<WalletTransaction> {
    const amountInCents = Math.round(withdrawDto.amount * 100); // Convert dollars to cents

    // Validate amount
    if (amountInCents <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    let transaction: SequelizeTransaction | null = null;

    try {
      transaction = await this.walletRepository.sequelize!.transaction();

      // Check for existing transaction with same idempotency key
      const existingTransaction = await this.walletTransactionRepository.findOne({
        where: { idempotency_key: withdrawDto.idempotency_key },
        transaction,
      });

      if (existingTransaction) {
        await transaction.rollback();
        
        // Verify the idempotency key parameters match
        if (
          existingTransaction.amount !== amountInCents ||
          existingTransaction.type !== TransactionType.WITHDRAW
        ) {
          throw new ConflictException('Idempotency key already used with different parameters');
        }

        return existingTransaction;
      }

      // Get wallet and lock it
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

      // Check for overdraft
      if (wallet.balance < amountInCents) {
        await transaction.rollback();
        throw new BadRequestException('Insufficient funds');
      }

      // Record balance before
      const balanceBefore = wallet.balance;

      // Update balance
      wallet.balance -= amountInCents;
      await wallet.save({ transaction });

      // Create transaction record
      const walletTransaction = await this.walletTransactionRepository.create(
        {
          wallet_id: wallet.id,
          type: TransactionType.WITHDRAW,
          amount: amountInCents,
          balance_before: balanceBefore,
          balance_after: wallet.balance,
          idempotency_key: withdrawDto.idempotency_key,
          description: `Withdrawal of $${withdrawDto.amount.toFixed(2)}`,
          metadata: { userId, amount: withdrawDto.amount },
        } as any,
        { transaction },
      );

      await transaction.commit();
      
      // Invalidate wallet balance cache
      await this.cacheService.delete(CacheService.getWalletBalanceKey(userId));
      
      return walletTransaction;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to process withdrawal');
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(userId: string, query: TransactionQueryDto): Promise<{
    transactions: WalletTransaction[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const wallet = await this.walletRepository.findOne({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const whereClause: any = { wallet_id: wallet.id };

    if (query.type) {
      whereClause.type = query.type;
    }

    const limit = query.limit || 10;
    const offset = query.offset || 0;

    const { rows: transactions, count: total } =
      await this.walletTransactionRepository.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

    return { transactions, total, limit, offset };
  }
}
