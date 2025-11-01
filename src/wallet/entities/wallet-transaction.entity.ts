import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Default,
} from 'sequelize-typescript';
import { DataType } from 'sequelize-typescript';
import { Wallet } from './wallet.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TransactionType enum for wallet transactions
 */
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  PURCHASE = 'purchase',
  EARNING = 'earning',
}

/**
 * WalletTransaction is a model that represents a wallet transaction
 */
@Table({
  tableName: 'wallet_transactions',
  timestamps: true,
})
export class WalletTransaction extends Model<WalletTransaction> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  @ApiProperty({ example: 'uuid', description: 'The ID of the transaction' })
  declare id: string;

  @ForeignKey(() => Wallet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ApiProperty({ example: 'uuid', description: 'The ID of the wallet' })
  declare wallet_id: string;

  @Column({
    type: DataType.ENUM,
    values: Object.values(TransactionType),
    allowNull: false,
  })
  @ApiProperty({ example: 'deposit', description: 'The type of transaction', enum: TransactionType })
  declare type: TransactionType;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  @ApiProperty({ example: 10000, description: 'The transaction amount in cents' })
  declare amount: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  @ApiProperty({ example: 50000, description: 'The balance before this transaction in cents' })
  declare balance_before: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  @ApiProperty({ example: 60000, description: 'The balance after this transaction in cents' })
  declare balance_after: number;

  @Column({
    type: 'VARCHAR(255)',
    allowNull: false,
    unique: true,
  })
  @ApiProperty({ example: 'uuid-idempotency-key', description: 'Unique idempotency key for the transaction' })
  declare idempotency_key: string;

  @Column({
    type: 'TEXT',
    allowNull: true,
  })
  @ApiProperty({ example: 'Deposit via bank transfer', description: 'Description of the transaction' })
  declare description: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  @ApiProperty({ example: {}, description: 'Additional metadata for the transaction' })
  declare metadata: any;

  @BelongsTo(() => Wallet)
  @ApiProperty({ description: 'The wallet this transaction belongs to' })
  wallet: Wallet;
}

