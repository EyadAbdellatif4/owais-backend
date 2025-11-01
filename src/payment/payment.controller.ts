import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { StripeService } from './services/stripe.service';
import { OrderService } from '../order/order.service';
import { Public } from '../auth/decorators/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import Stripe from 'stripe';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly orderService: OrderService,
  ) {}

  @Public()
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description: 'Receives webhook events from Stripe for payment confirmations. This endpoint is public and verifies Stripe signatures.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!this.stripeService.isConfigured()) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }

    const payload = req.rawBody;

    if (!payload || !signature) {
      throw new BadRequestException('Missing payload or signature');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = this.stripeService.verifyWebhookSignature(payload, signature);
    } catch (error) {
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid' && session.metadata?.orderId) {
          try {
            await this.orderService.handleStripeWebhook(session.id);
          } catch (error) {
            // Log error but don't fail the webhook (Stripe will retry)
            console.error('Failed to process checkout.session.completed:', error);
            throw error;
          }
        }
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata?.orderId) {
          try {
            // Try to find order by payment intent
            const order = await this.orderService.findOne(paymentIntent.metadata.orderId);
            if (order && order.status === 'pending') {
              await this.orderService.handleStripeWebhook(
                order.stripe_session_id || '',
                paymentIntent.id,
              );
            }
          } catch (error) {
            console.error('Failed to process payment_intent.succeeded:', error);
            throw error;
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        if (failedPaymentIntent.metadata?.orderId) {
          try {
            // Update order status to failed
            await this.orderService.updateStatus(
              failedPaymentIntent.metadata.orderId,
              { status: 'failed' } as any,
              undefined,
            );
          } catch (error) {
            console.error('Failed to process payment_intent.payment_failed:', error);
          }
        }
        break;

      default:
        // Unhandled event type
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  @UseGuards(AuthGuard)
  @Get('stripe/session/:orderId')
  @ApiOperation({
    summary: 'Get Stripe payment session status',
    description: 'Check the status of a Stripe payment session for an order',
  })
  @ApiParam({
    name: 'orderId',
    description: 'The ID of the order',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found',
  })
  async getSessionStatus(@Param('orderId') orderId: string): Promise<{
    orderId: string;
    sessionId: string | null;
    paymentStatus: string;
    sessionUrl: string | null;
  }> {
    const order = await this.orderService.findOne(orderId);

    if (!order.stripe_session_id) {
      throw new BadRequestException('Order does not have a Stripe session');
    }

    const session = await this.stripeService.retrieveCheckoutSession(
      order.stripe_session_id,
    );

    return {
      orderId: order.id,
      sessionId: session.id,
      paymentStatus: session.payment_status || 'unknown',
      sessionUrl: session.url,
    };
  }
}

