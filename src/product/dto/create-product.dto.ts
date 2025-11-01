import { IsString, IsNotEmpty, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateProductDto is a DTO for creating a new product
 */
export class CreateProductDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  @ApiProperty({
    example: 'Gift Card $50',
    description: 'The name of the product',
    minLength: 1,
    maxLength: 255,
  })
  declare name: string;

  @IsNumber({}, { message: 'Price must be a number' })
  @IsNotEmpty({ message: 'Price is required' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  @ApiProperty({
    example: 50.00,
    description: 'The price of the product',
    minimum: 0.01,
  })
  declare price: number;

  @IsNumber({}, { message: 'Available units must be a number' })
  @IsNotEmpty({ message: 'Available units is required' })
  @Min(0, { message: 'Available units cannot be negative' })
  @ApiProperty({
    example: 10,
    description: 'The number of available units in stock',
    minimum: 0,
  })
  declare availableUnits: number;
}

