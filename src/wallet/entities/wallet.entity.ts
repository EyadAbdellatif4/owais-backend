import {
  BelongsTo,
  HasMany,
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Default,
} from 'sequelize-typescript';
import { DataType } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Wallet is a model that represents a user's wallet
 */
@Table({
  tableName: 'wallets',
  timestamps: true,
})
export class Wallet extends Model<Wallet> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  @ApiProperty({ example: 'uuid', description: 'The ID of the wallet' })
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  @ApiProperty({ example: 'uuid', description: 'The ID of the user' })
  declare user_id: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })
  @ApiProperty({ example: 100000, description: 'The wallet balance in cents' })
  declare balance: number;

  @BelongsTo(() => User)
  @ApiProperty({ description: 'The user who owns this wallet' })
  user: User;

  @HasMany(() => WalletTransaction)
  @ApiProperty({ description: 'The transactions associated with this wallet' })
  transactions: WalletTransaction[];
}

