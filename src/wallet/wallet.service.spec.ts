import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction, TransactionType } from './entities/wallet-transaction.entity';
import { User } from '../users/entities/user.entity';
import { CacheService } from '../shared/services/cache.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DepositWalletDto } from './dto/deposit-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { v4 as uuidv4 } from 'uuid';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: any;
  let walletTransactionRepository: any;
  let userRepository: any;
  let cacheService: CacheService;
  let sequelize: any;

  const mockWallet = {
    id: 'wallet-1',
    user_id: 'user-1',
    balance: 10000, // $100.00 in cents
    save: jest.fn(),
    reload: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockWalletTransaction = {
    id: 'tx-1',
    wallet_id: 'wallet-1',
    type: TransactionType.DEPOSIT,
    amount: 5000,
    balance_before: 0,
    balance_after: 5000,
    idempotency_key: 'idempotency-key-1',
    description: 'Deposit',
    metadata: {},
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

    walletRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      sequelize,
    };

    walletTransactionRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    };

    userRepository = {
      findByPk: jest.fn(),
    };

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getModelToken(Wallet),
          useValue: walletRepository,
        },
        {
          provide: getModelToken(WalletTransaction),
          useValue: walletTransactionRepository,
        },
        {
          provide: getModelToken(User),
          useValue: userRepository,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return balance from cache if available', async () => {
      const cachedBalance = { balance: 100, user_email: 'test@example.com', user_name: 'Test User' };
      cacheService.get = jest.fn().mockResolvedValue(cachedBalance);

      const result = await service.getBalance('user-1');

      expect(result).toEqual(cachedBalance);
      expect(cacheService.get).toHaveBeenCalledWith('wallet:balance:user-1');
      expect(walletRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch balance from database if not cached', async () => {
      cacheService.get = jest.fn().mockResolvedValue(undefined);
      walletRepository.findOne = jest.fn().mockResolvedValue(mockWallet);
      userRepository.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await service.getBalance('user-1');

      expect(result).toEqual({
        balance: 100,
        user_email: 'test@example.com',
        user_name: 'Test User',
      });
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      cacheService.get = jest.fn().mockResolvedValue(undefined);
      walletRepository.findOne = jest.fn().mockResolvedValue(mockWallet);
      userRepository.findByPk = jest.fn().mockResolvedValue(null);

      await expect(service.getBalance('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should create wallet if it does not exist', async () => {
      cacheService.get = jest.fn().mockResolvedValue(undefined);
      walletRepository.findOne = jest.fn().mockResolvedValue(null);
      walletRepository.create = jest.fn().mockResolvedValue({ ...mockWallet, balance: 0 });
      userRepository.findByPk = jest.fn().mockResolvedValue(mockUser);

      await service.getBalance('user-1');

      expect(walletRepository.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        balance: 0,
      });
    });
  });

  describe('deposit', () => {
    const depositDto: DepositWalletDto = {
      amount: 50.00,
      idempotency_key: uuidv4(),
    };

    it('should successfully deposit funds', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      walletTransactionRepository.findOne = jest.fn().mockResolvedValue(null);
      walletRepository.findOne = jest.fn().mockResolvedValue(mockWallet);
      walletTransactionRepository.create = jest.fn().mockResolvedValue(mockWalletTransaction);

      const result = await service.deposit('user-1', depositDto);

      expect(result).toBeDefined();
      expect(mockWallet.balance).toBe(15000); // 10000 + 5000
      expect(mockWallet.save).toHaveBeenCalled();
      expect(walletTransactionRepository.create).toHaveBeenCalled();
      expect(mockTx.commit).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith('wallet:balance:user-1');
    });

    it('should return existing transaction if idempotency key matches', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      walletTransactionRepository.findOne = jest.fn().mockResolvedValue(mockWalletTransaction);

      const result = await service.deposit('user-1', depositDto);

      expect(result).toEqual(mockWalletTransaction);
      expect(mockTx.rollback).toHaveBeenCalled();
      expect(walletRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if idempotency key exists with different parameters', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      const existingTx = { ...mockWalletTransaction, amount: 3000 };
      walletTransactionRepository.findOne = jest.fn().mockResolvedValue(existingTx);

      await expect(service.deposit('user-1', depositDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const invalidDto: DepositWalletDto = {
        amount: 0,
        idempotency_key: uuidv4(),
      };

      await expect(service.deposit('user-1', invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdraw', () => {
    const withdrawDto: WithdrawWalletDto = {
      amount: 30.00,
      idempotency_key: uuidv4(),
    };

    it('should successfully withdraw funds', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      walletTransactionRepository.findOne = jest.fn().mockResolvedValue(null);
      walletRepository.findOne = jest.fn().mockResolvedValue(mockWallet);
      walletTransactionRepository.create = jest.fn().mockResolvedValue({
        ...mockWalletTransaction,
        type: TransactionType.WITHDRAW,
      });

      mockWallet.balance = 10000; // Reset for this test

      const result = await service.withdraw('user-1', withdrawDto);

      expect(result).toBeDefined();
      expect(mockWallet.balance).toBe(7000); // 10000 - 3000
      expect(mockWallet.save).toHaveBeenCalled();
      expect(mockTx.commit).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith('wallet:balance:user-1');
    });

    it('should throw BadRequestException for insufficient funds', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      walletTransactionRepository.findOne = jest.fn().mockResolvedValue(null);
      walletRepository.findOne = jest.fn().mockResolvedValue({
        ...mockWallet,
        balance: 1000, // Less than withdrawal amount
      });

      await expect(service.withdraw('user-1', withdrawDto)).rejects.toThrow(BadRequestException);
      expect(mockTx.rollback).toHaveBeenCalled();
    });

    it('should create wallet if it does not exist', async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
      sequelize.transaction = jest.fn().mockResolvedValue(mockTx);

      walletTransactionRepository.findOne = jest.fn().mockResolvedValue(null);
      walletRepository.findOne = jest.fn().mockResolvedValue(null);
      walletRepository.create = jest.fn().mockResolvedValue({ ...mockWallet, balance: 0 });

      await expect(service.withdraw('user-1', withdrawDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTransactions', () => {
    it('should return transactions with pagination', async () => {
      const mockTransactions = [mockWalletTransaction];
      walletTransactionRepository.findAll = jest.fn().mockResolvedValue(mockTransactions);
      walletTransactionRepository.count = jest.fn().mockResolvedValue(1);

      const queryDto = { page: 1, limit: 10 };

      const result = await service.getTransactions('user-1', queryDto);

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by transaction type', async () => {
      walletTransactionRepository.findAll = jest.fn().mockResolvedValue([]);
      walletTransactionRepository.count = jest.fn().mockResolvedValue(0);

      const queryDto = { page: 1, limit: 10, type: TransactionType.DEPOSIT };

      await service.getTransactions('user-1', queryDto);

      expect(walletTransactionRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: TransactionType.DEPOSIT,
          }),
        }),
      );
    });
  });
});
