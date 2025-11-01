import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../entities/wallet-transaction.entity';

export class TransactionResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Transaction ID',
  })
  declare id: string;

  @ApiProperty({
    example: 'deposit',
    description: 'Transaction type',
    enum: TransactionType,
  })
  declare type: TransactionType;

  @ApiProperty({
    example: 100.50,
    description: 'Transaction amount in dollars',
  })
  declare amount: number;

  @ApiProperty({
    example: 500.00,
    description: 'Balance before transaction in dollars',
  })
  declare balance_before: number;

  @ApiProperty({
    example: 600.50,
    description: 'Balance after transaction in dollars',
  })
  declare balance_after: number;

  @ApiProperty({
    example: 'Deposit via bank transfer',
    description: 'Transaction description',
    required: false,
  })
  declare description?: string;

  @ApiProperty({
    example: { source: 'payment_gateway' },
    description: 'Additional metadata',
    required: false,
  })
  declare metadata?: any;

  @ApiProperty({
    example: '2025-10-28T00:00:00.000Z',
    description: 'Transaction created timestamp',
  })
  declare createdAt: Date;
}

