import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.');
    } else {
      const apiVersion = (this.configService.get<string>('STRIPE_API_VERSION') || '2024-11-20.acacia') as Stripe.LatestApiVersion;
      this.stripe = new Stripe(secretKey, {
        apiVersion,
      });
      this.logger.log('Stripe client initialized successfully (Test Mode)');
    }

    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  /**
   * Create a Stripe Checkout Session
   */
  async createCheckoutSession(
    orderId: string,
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {},
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `Order ${orderId}`,
                description: metadata.productName || 'Digital Product',
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          orderId,
          ...metadata,
        },
      });

      this.logger.log(`Stripe Checkout Session created: ${session.id} for order ${orderId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create Stripe Checkout Session for order ${orderId}:`, error);
      throw new BadRequestException(`Failed to create payment session: ${error.message}`);
    }
  }

  /**
   * Create a Stripe Payment Intent
   */
  async createPaymentIntent(
    orderId: string,
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {},
  ): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          orderId,
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Stripe Payment Intent created: ${paymentIntent.id} for order ${orderId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to create Stripe Payment Intent for order ${orderId}:`, error);
      throw new BadRequestException(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve a Payment Intent by ID
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to retrieve Payment Intent ${paymentIntentId}:`, error);
      throw new BadRequestException(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve a Checkout Session by ID
   */
  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
      return session;
    } catch (error) {
      this.logger.error(`Failed to retrieve Checkout Session ${sessionId}:`, error);
      throw new BadRequestException(`Failed to retrieve checkout session: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }

    if (!this.webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not set. Webhook signature verification skipped.');
      // In development/test, we might want to allow unsigned webhooks
      try {
        return JSON.parse(payload.toString()) as Stripe.Event;
      } catch (error) {
        throw new BadRequestException('Invalid webhook payload');
      }
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
      return event;
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return !!this.stripe;
  }
}

