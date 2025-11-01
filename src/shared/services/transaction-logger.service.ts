import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TransactionLog } from '../database/entities/transaction-log.entity';
import { TransactionActionType } from '../enums';

@Injectable()
export class TransactionLoggerService {
  private readonly logger = new Logger(TransactionLoggerService.name);

  constructor(
    @InjectModel(TransactionLog)
    private transactionLogRepository: typeof TransactionLog,
  ) {}

  /**
   * Log a transaction with comprehensive details
   */
  async log(params: {
    userId?: string | null;
    actionType: string;
    entityType: string;
    entityId: string;
    status: 'success' | 'failed' | 'pending';
    details?: any;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<TransactionLog> {
    try {
      const log = await this.transactionLogRepository.create({
        user_id: params.userId || null,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        status: params.status,
        details: params.details || null,
        error_message: params.errorMessage || null,
        ip_address: params.ipAddress || null,
      } as any);

      // Also log to application logger
      const logMessage = `Transaction Log: ${params.actionType} | Entity: ${params.entityType}:${params.entityId} | Status: ${params.status}`;
      if (params.status === 'failed') {
        this.logger.error(logMessage, params.errorMessage || '');
      } else {
        this.logger.log(logMessage);
      }

      return log;
    } catch (error) {
      // Log the error but don't throw - logging failures shouldn't break the main flow
      this.logger.error('Failed to create transaction log', error);
      throw error;
    }
  }

  /**
   * Log order-related transactions
   */
  async logOrder(params: {
    userId: string;
    orderId: string;
    actionType: TransactionActionType;
    status: 'success' | 'failed' | 'pending';
    details?: any;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<TransactionLog> {
    return this.log({
      userId: params.userId,
      actionType: params.actionType,
      entityType: 'order',
      entityId: params.orderId,
      status: params.status,
      details: params.details,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Log wallet-related transactions
   */
  async logWallet(params: {
    userId: string;
    walletTransactionId: string;
    actionType: TransactionActionType;
    status: 'success' | 'failed' | 'pending';
    details?: any;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<TransactionLog> {
    return this.log({
      userId: params.userId,
      actionType: params.actionType,
      entityType: 'wallet',
      entityId: params.walletTransactionId,
      status: params.status,
      details: params.details,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Log product-related transactions
   */
  async logProduct(params: {
    userId?: string | null;
    productId: string;
    actionType: TransactionActionType;
    status: 'success' | 'failed' | 'pending';
    details?: any;
    errorMessage?: string | null;
    ipAddress?: string | null;
  }): Promise<TransactionLog> {
    return this.log({
      userId: params.userId,
      actionType: params.actionType,
      entityType: 'product',
      entityId: params.productId,
      status: params.status,
      details: params.details,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
    });
  }
}

