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
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Product is a model that represents a digital product created by a merchant
 */
@Table({
  tableName: 'products',
  timestamps: true,
})
export class Product extends Model<Product> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  @ApiProperty({ example: 'uuid', description: 'The ID of the product' })
  declare id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  @ApiProperty({ example: 'Gift Card $50', description: 'The name of the product' })
  declare name: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  @ApiProperty({ example: 50.00, description: 'The price of the product' })
  declare price: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  @ApiProperty({ example: 10, description: 'The number of available units' })
  declare availableUnits: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ApiProperty({ example: 'uuid', description: 'The ID of the merchant who created this product' })
  declare merchant_id: string;

  @BelongsTo(() => User, 'merchant_id')
  @ApiProperty({ description: 'The merchant who created this product' })
  merchant: User;
}

