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
import { User } from '../../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TransactionLog is a model that represents an audit log entry for transaction tracking
 */
@Table({
  tableName: 'transaction_logs',
  timestamps: true,
  updatedAt: false, // Only track creation time
})
export class TransactionLog extends Model<TransactionLog> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  @ApiProperty({ example: 'uuid', description: 'The ID of the transaction log' })
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  @ApiProperty({ 
    example: 'uuid', 
    description: 'The ID of the user who performed the action',
    required: false,
  })
  declare user_id: string | null;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  @ApiProperty({ 
    example: 'order_created', 
    description: 'The type of action performed',
  })
  declare action_type: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  @ApiProperty({ 
    example: 'order', 
    description: 'The type of entity affected (order, wallet, product)',
  })
  declare entity_type: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ApiProperty({ 
    example: 'uuid', 
    description: 'The ID of the affected entity',
  })
  declare entity_id: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  @ApiProperty({ 
    example: 'success', 
    description: 'The status of the transaction (success, failed, pending)',
  })
  declare status: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  @ApiProperty({ 
    example: { amount: 50.00, productId: 'uuid' }, 
    description: 'Additional details about the transaction',
    required: false,
  })
  declare details: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  @ApiProperty({ 
    example: 'Insufficient funds', 
    description: 'Error message if the transaction failed',
    required: false,
  })
  declare error_message: string | null;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
  })
  @ApiProperty({ 
    example: '192.168.1.1', 
    description: 'IP address of the user who performed the action',
    required: false,
  })
  declare ip_address: string | null;

  @BelongsTo(() => User)
  @ApiProperty({ description: 'The user who performed this action', required: false })
  user: User | null;
}

