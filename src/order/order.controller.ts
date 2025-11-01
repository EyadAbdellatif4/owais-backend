import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { Order } from './entities/order.entity';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates a new order for a product. Supports wallet and gateway payment methods.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or insufficient funds/stock',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async create(
    @CurrentUser() user: any,
    @Body(ValidationPipe) createOrderDto: CreateOrderDto,
    @Request() req: any,
  ): Promise<OrderResponseDto> {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const order = await this.orderService.create(createOrderDto, user.id, ipAddress);
    
    // mapOrderToResponseDto will automatically include paymentSessionUrl if available
    return this.mapOrderToResponseDto(order);
  }

  @Get('my-orders')
  @ApiOperation({
    summary: 'Get current user orders',
    description: 'Retrieves all orders for the currently authenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully',
    type: [OrderResponseDto],
  })
  async findMyOrders(@CurrentUser() user: any): Promise<OrderResponseDto[]> {
    const orders = await this.orderService.findByUserId(user.id);
    return orders.map((order) => this.mapOrderToResponseDto(order));
  }

  @Get()
  @ApiOperation({
    summary: 'Get all orders',
    description: 'Retrieves all orders. Users can only see their own orders.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully',
    type: [OrderResponseDto],
  })
  async findAll(@CurrentUser() user: any): Promise<OrderResponseDto[]> {
    // Users can only see their own orders
    const orders = await this.orderService.findByUserId(user.id);
    return orders.map((order) => this.mapOrderToResponseDto(order));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single order by ID',
    description: 'Retrieves a specific order by its UUID.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'The order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order retrieved successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async findOne(@Param('id') id: string): Promise<OrderResponseDto> {
    const order = await this.orderService.findOne(id);
    return this.mapOrderToResponseDto(order);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Updates an order status (typically used for gateway payment confirmations).',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'The order ID' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order updated successfully',
    type: OrderResponseDto,
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body(ValidationPipe) updateOrderDto: UpdateOrderDto,
    @Request() req: any,
  ): Promise<OrderResponseDto> {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const order = await this.orderService.updateStatus(id, updateOrderDto, user.id, ipAddress);
    return this.mapOrderToResponseDto(order);
  }

  /**
   * Map Order entity to OrderResponseDto
   */
  private mapOrderToResponseDto(order: Order): OrderResponseDto {
    const dto: any = {
      id: order.id,
      user_id: order.user_id,
      product_id: order.product_id,
      quantity: order.quantity,
      total_amount: Number(order.total_amount),
      payment_method: order.payment_method,
      status: order.status,
      gateway_transaction_id: order.gateway_transaction_id || undefined,
      stripe_session_id: order.stripe_session_id || undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    // Add payment session URL if available (attached by service)
    if ((order as any).paymentSessionUrl) {
      dto.paymentSessionUrl = (order as any).paymentSessionUrl;
    }

    return dto;
  }
}

