import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../shared/enums';

/**
 * UpdateOrderDto is a DTO for updating an order (typically status updates)
 */
export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsEnum(OrderStatus, { message: 'Status must be a valid order status' })
  @IsOptional()
  @ApiProperty({
    example: OrderStatus.COMPLETED,
    description: 'The status of the order',
    enum: OrderStatus,
    required: false,
  })
  declare status?: OrderStatus;

  @IsString({ message: 'Gateway transaction ID must be a string' })
  @IsOptional()
  @ApiProperty({
    example: 'stripe_charge_123',
    description: 'The gateway transaction ID (for gateway payments)',
    required: false,
  })
  declare gateway_transaction_id?: string;
}

