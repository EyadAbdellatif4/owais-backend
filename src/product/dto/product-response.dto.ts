import { ApiProperty } from '@nestjs/swagger';

/**
 * ProductResponseDto is a DTO for product responses
 */
export class ProductResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The ID of the product',
  })
  declare id: string;

  @ApiProperty({
    example: 'Gift Card $50',
    description: 'The name of the product',
  })
  declare name: string;

  @ApiProperty({
    example: 50.00,
    description: 'The price of the product',
  })
  declare price: number;

  @ApiProperty({
    example: 10,
    description: 'The number of available units',
  })
  declare availableUnits: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The ID of the merchant who created this product',
  })
  declare merchant_id: string;

  @ApiProperty({
    example: '2025-01-28T00:00:00.000Z',
    description: 'The creation date of the product',
  })
  declare createdAt: Date;

  @ApiProperty({
    example: '2025-01-28T00:00:00.000Z',
    description: 'The last update date of the product',
  })
  declare updatedAt: Date;
}

