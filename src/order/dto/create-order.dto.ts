import { IsNotEmpty, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../shared/enums';

/**
 * CreateOrderDto is a DTO for creating a new order
 */
export class CreateOrderDto {
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsUUID(4, { message: 'Product ID must be a valid UUID v4' })
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The ID of the product to purchase',
    format: 'uuid',
  })
  declare productId: string;

  @IsEnum(PaymentMethod, { message: 'Payment method must be either wallet or gateway' })
  @IsNotEmpty({ message: 'Payment method is required' })
  @ApiProperty({
    example: PaymentMethod.WALLET,
    description: 'The payment method to use',
    enum: PaymentMethod,
  })
  declare paymentMethod: PaymentMethod;
}

