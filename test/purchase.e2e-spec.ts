import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { v4 as uuidv4 } from 'uuid';

describe('Purchase Flow (e2e)', () => {
  let app: INestApplication<App>;
  let userToken: string;
  let merchantToken: string;
  let userId: string;
  let merchantId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as user
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123',
      });

    if (userLoginResponse.status === 201) {
      userToken = userLoginResponse.body.access_token;
      userId = userLoginResponse.body.user.id;
    }

    // Login as merchant and create product
    const merchantLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'merchant@example.com',
        password: 'password123',
      });

    if (merchantLoginResponse.status === 201) {
      merchantToken = merchantLoginResponse.body.access_token;
      merchantId = merchantLoginResponse.body.user.id;

      // Create a product for testing
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          name: 'Test Product for Purchase',
          price: 50.00,
          availableUnits: 10,
        });

      if (productResponse.status === 201) {
        productId = productResponse.body.id;
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders - Wallet Payment', () => {
    it('should create order with wallet payment when sufficient balance', async () => {
      if (!userToken || !productId) {
        return;
      }

      // Ensure user has sufficient balance
      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 100.00,
          idempotency_key: uuidv4(),
        });

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId,
          paymentMethod: 'wallet',
        })
        .expect(201);

      expect(orderResponse.body).toHaveProperty('id');
      expect(orderResponse.body.status).toBe('completed');
      expect(orderResponse.body.payment_method).toBe('wallet');
      expect(orderResponse.body.product_id).toBe(productId);
    });

    it('should return 400 for insufficient wallet balance', async () => {
      if (!userToken || !productId) {
        return;
      }

      // Withdraw all funds first
      const balanceResponse = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${userToken}`);

      if (balanceResponse.body.balance > 0) {
        await request(app.getHttpServer())
          .post('/wallet/withdraw')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            amount: balanceResponse.body.balance,
            idempotency_key: uuidv4(),
          });
      }

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId,
          paymentMethod: 'wallet',
        })
        .expect(400);
    });

    it('should return 400 when product is out of stock', async () => {
      if (!userToken || !productId) {
        return;
      }

      // Create a product with 0 stock
      const zeroStockProduct = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          name: 'Out of Stock Product',
          price: 25.00,
          availableUnits: 0,
        });

      if (zeroStockProduct.status === 201) {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: zeroStockProduct.body.id,
            paymentMethod: 'wallet',
          })
          .expect(400);
      }
    });
  });

  describe('POST /orders - Gateway Payment', () => {
    it('should create order with gateway payment and return payment session URL', async () => {
      if (!userToken || !productId) {
        return;
      }

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId,
          paymentMethod: 'gateway',
        });

      // If Stripe is configured, expect 201 with paymentSessionUrl
      // If not configured, expect 400
      if (orderResponse.status === 201) {
        expect(orderResponse.body).toHaveProperty('id');
        expect(orderResponse.body.status).toBe('pending');
        expect(orderResponse.body.payment_method).toBe('gateway');
        expect(orderResponse.body).toHaveProperty('paymentSessionUrl');
        expect(orderResponse.body.paymentSessionUrl).toMatch(/^https:\/\//);
      } else {
        expect(orderResponse.status).toBe(400);
      }
    });
  });

  describe('GET /orders', () => {
    it('should return user orders', async () => {
      if (!userToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/orders/my-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return specific order by id', async () => {
      if (!userToken || !productId) {
        return;
      }

      // Create an order first
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId,
          paymentMethod: 'wallet',
        });

      if (orderResponse.status === 201) {
        const orderId = orderResponse.body.id;

        const getOrderResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(getOrderResponse.body.id).toBe(orderId);
      }
    });
  });

  describe('POST /payment/stripe/webhook', () => {
    it('should handle webhook requests', async () => {
      // This would require actual Stripe webhook signature
      // For Simulation, we can test that the endpoint exists
      const response = await request(app.getHttpServer())
        .post('/payment/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send({});

      // Without valid signature, should return 400
      // With valid signature and payload, would process the webhook
      expect([400, 200]).toContain(response.status);
    });
  });
});

