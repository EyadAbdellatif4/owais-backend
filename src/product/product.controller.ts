import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../shared/enums';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { Product } from './entities/product.entity';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles(RoleName.MERCHANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new product',
    description: 'Creates a new digital product with limited stock. Only merchants can create products.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error - Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Merchant role required',
  })
  async create(
    @CurrentUser() user: any,
    @Body(ValidationPipe) createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.create(createProductDto, user.id);
    return this.mapProductToResponseDto(product);
  }

  @Get()
  @ApiOperation({ 
    summary: 'List all products',
    description: 'Retrieves all available products. All authenticated users can view products. Products with availableUnits = 0 are visible but not purchasable.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    type: [ProductResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productService.findAll();
    return products.map((product) => this.mapProductToResponseDto(product));
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a product by ID',
    description: 'Retrieves a specific product by its UUID.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'The product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing token',
  })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const product = await this.productService.findOne(id);
    return this.mapProductToResponseDto(product);
  }

  @Patch(':id')
  @Roles(RoleName.MERCHANT)
  @ApiOperation({ 
    summary: 'Update a product',
    description: 'Updates an existing product. Only the merchant who created the product can update it.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'The product ID' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error - Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - You can only update products that you created',
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.update(id, updateProductDto, user.id);
    return this.mapProductToResponseDto(product);
  }

  @Delete(':id')
  @Roles(RoleName.MERCHANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete a product',
    description: 'Deletes a product. Only the merchant who created the product can delete it.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'The product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deleted successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - You can only delete products that you created',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.remove(id, user.id);
    return this.mapProductToResponseDto(product);
  }

  /**
   * Map Product entity to ProductResponseDto
   */
  private mapProductToResponseDto(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      availableUnits: product.availableUnits,
      merchant_id: product.merchant_id,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}

