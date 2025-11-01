import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Product } from './entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CacheService } from '../shared/services/cache.service';

@Injectable()
export class ProductService {
  private readonly PRODUCTS_LIST_TTL = 300; // 5 minutes
  private readonly PRODUCT_TTL = 600; // 10 minutes

  constructor(
    @InjectModel(Product)
    private productRepository: typeof Product,
    @InjectModel(User)
    private userRepository: typeof User,
    private cacheService: CacheService,
  ) {}

  /**
   * Create a new product (merchant-only)
   */
  async create(createProductDto: CreateProductDto, merchantId: string): Promise<Product> {
    // Verify merchant exists
    const merchant = await this.userRepository.findByPk(merchantId);
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Create product
    const product = await this.productRepository.create({
      ...createProductDto,
      merchant_id: merchantId,
    } as any);

    // Invalidate added list cache
    await this.cacheService.delete(CacheService.getProductListKey());

    return product;
  }

  /**
   * Get all products (all users can view)
   * Products with availableUnits = 0 are still visible but not purchasable
   */
  async findAll(): Promise<Product[]> {
    const cacheKey = CacheService.getProductListKey();
    
    // Try to get from cache
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const products = await this.productRepository.findAll({
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Store in cache
    await this.cacheService.set(cacheKey, products, this.PRODUCTS_LIST_TTL * 1000);

    return products;
  }

  /**
   * Get a single product by ID
   */
  async findOne(id: string): Promise<Product> {
    const cacheKey = CacheService.getProductKey(id);
    
    // Try to get from cache
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const product = await this.productRepository.findByPk(id, {
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Store in cache
    await this.cacheService.set(cacheKey, product, this.PRODUCT_TTL * 1000);

    return product;
  }

  /**
   * Update a product (only the merchant who created it can update)
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    merchantId: string,
  ): Promise<Product> {
    const product = await this.productRepository.findByPk(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership
    if (product.merchant_id !== merchantId) {
      throw new ForbiddenException('You can only update products that you created');
    }

    // Update product
    await product.update(updateProductDto as any);

    // Invalidate cache
    await this.invalidateProductCache(id);

    return product;
  }

  /**
   * Remove a product (only the merchant who created it can delete)
   */
  async remove(id: string, merchantId: string): Promise<Product> {
    const product = await this.productRepository.findByPk(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check ownership
    if (product.merchant_id !== merchantId) {
      throw new ForbiddenException('You can only delete products that you created');
    }

    // Delete product
    await product.destroy();

    // Invalidate cache
    await this.invalidateProductCache(id);

    return product;
  }

  /**
   * Check if a product is purchasable (availableUnits > 0)
   */
  async isPurchasable(id: string): Promise<boolean> {
    const product = await this.productRepository.findByPk(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product.availableUnits > 0;
  }

  /**
   * Decrease product stock by a specified quantity
   */
  async decreaseStock(id: string, quantity: number): Promise<Product> {
    const product = await this.productRepository.findByPk(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.availableUnits < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.availableUnits}, Requested: ${quantity}`,
      );
    }

    product.availableUnits -= quantity;
    await product.save();

    // Invalidate cache after stock change
    await this.invalidateProductCache(id);

    return product;
  }

  /**
   * Invalidate product cache (both single product and list)
   */
  private async invalidateProductCache(productId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(CacheService.getProductListKey()),
      this.cacheService.delete(CacheService.getProductKey(productId)),
    ]);
  }
}

