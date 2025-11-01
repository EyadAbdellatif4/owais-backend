import { IsNotEmpty, IsNumber, IsString, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositWalletDto {
  @ApiProperty({
    example: 100.50,
    description: 'Amount to deposit in dollars',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least $0.01' })
  declare amount: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique idempotency key to prevent duplicate transactions',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID(4, { message: 'Idempotency key must be a valid UUID v4' })
  declare idempotency_key: string;
}

