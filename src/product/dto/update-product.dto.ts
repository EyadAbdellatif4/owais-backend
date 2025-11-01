import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

/**
 * UpdateProductDto is a DTO for updating a product
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}

