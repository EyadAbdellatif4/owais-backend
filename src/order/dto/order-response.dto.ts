import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, OrderStatus } from '../../shared/enums';

/**
 * OrderResponseDto is a DTO for order responses
 */
export class OrderResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The ID of the order',
  })
  declare id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The ID of the user who placed the order',
  })
  declare user_id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The ID of the product being ordered',
  })
  declare product_id: string;

  @ApiProperty({
    example: 1,
    description: 'The quantity of products ordered',
  })
  declare quantity: number;

  @ApiProperty({
    example: 50.00,
    description: 'The total amount of the order',
  })
  declare total_amount: number;

  @ApiProperty({
    example: PaymentMethod.WALLET,
    description: 'The payment method used',
    enum: PaymentMethod,
  })
  declare payment_method: PaymentMethod;

  @ApiProperty({
    example: OrderStatus.COMPLETED,
    description: 'The status of the order',
    enum: OrderStatus,
  })
  declare status: OrderStatus;

  @ApiProperty({
    example: 'stripe_charge_123',
    description: 'The gateway transaction ID (if payment method is gateway)',
    required: false,
  })
  declare gateway_transaction_id?: string | null;

  @ApiProperty({
    example: 'cs_test_1234567890',
    description: 'The Stripe Checkout Session ID (for gateway payments)',
    required: false,
  })
  declare stripe_session_id?: string | null;

  @ApiProperty({
    example: 'https://checkout.stripe.com/pay/cs_test_1234567890',
    description: 'The payment session URL for gateway payments (redirect user here to complete payment)',
    required: false,
  })
  declare paymentSessionUrl?: string | null;

  @ApiProperty({
    example: '2025-01-28T00:00:00.000Z',
    description: 'The creation date of the order',
  })
  declare createdAt: Date;

  @ApiProperty({
    example: '2025-01-28T00:00:00.000Z',
    description: 'The last update date of the order',
  })
  declare updatedAt: Date;
}

