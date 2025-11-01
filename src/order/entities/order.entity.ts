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
import { Product } from '../../product/entities/product.entity';
import { PaymentMethod, OrderStatus } from '../../shared/enums';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Order is a model that represents a product purchase order
 */
@Table({
  tableName: 'orders',
  timestamps: true,
})
export class Order extends Model<Order> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  @ApiProperty({ example: 'uuid', description: 'The ID of the order' })
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ApiProperty({ example: 'uuid', description: 'The ID of the user who placed the order' })
  declare user_id: string;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ApiProperty({ example: 'uuid', description: 'The ID of the product being ordered' })
  declare product_id: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  @ApiProperty({ example: 1, description: 'The quantity of products ordered' })
  declare quantity: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  @ApiProperty({ example: 50.00, description: 'The total amount of the order' })
  declare total_amount: number;

  @Column({
    type: DataType.ENUM,
    values: Object.values(PaymentMethod),
    allowNull: false,
  })
  @ApiProperty({ 
    example: PaymentMethod.WALLET, 
    description: 'The payment method used',
    enum: PaymentMethod,
  })
  declare payment_method: PaymentMethod;

  @Column({
    type: DataType.ENUM,
    values: Object.values(OrderStatus),
    allowNull: false,
    defaultValue: OrderStatus.PENDING,
  })
  @ApiProperty({ 
    example: OrderStatus.PENDING, 
    description: 'The status of the order',
    enum: OrderStatus,
  })
  declare status: OrderStatus;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  @ApiProperty({ 
    example: 'stripe_charge_123', 
    description: 'The gateway transaction ID if payment method is gateway',
    required: false,
  })
  declare gateway_transaction_id: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  @ApiProperty({ 
    example: 'cs_test_1234567890', 
    description: 'The Stripe Checkout Session ID',
    required: false,
  })
  declare stripe_session_id: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  @ApiProperty({ 
    example: 'pi_test_1234567890', 
    description: 'The Stripe Payment Intent ID',
    required: false,
  })
  declare stripe_payment_intent_id: string | null;

  @BelongsTo(() => User)
  @ApiProperty({ description: 'The user who placed this order' })
  user: User;

  @BelongsTo(() => Product)
  @ApiProperty({ description: 'The product being ordered' })
  product: Product;
}

