import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../entities/wallet-transaction.entity';

export class TransactionQueryDto {
  @ApiProperty({
    example: 'deposit',
    description: 'Filter by transaction type',
    required: false,
    enum: TransactionType,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  declare type?: TransactionType;

  @ApiProperty({
    example: 10,
    description: 'Number of transactions to return',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare limit?: number;

  @ApiProperty({
    example: 0,
    description: 'Number of transactions to skip',
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare offset?: number;
}

