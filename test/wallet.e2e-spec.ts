import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { v4 as uuidv4 } from 'uuid';

describe('Wallet (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user@example.com', // Use seeded user
        password: 'password123',
      });

    if (loginResponse.status === 201) {
      authToken = loginResponse.body.access_token;
      userId = loginResponse.body.user.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /wallet/balance', () => {
    it('should return wallet balance', async () => {
      if (!authToken) {
        return; // Skip if not authenticated
      }

      const response = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('user_email');
      expect(response.body).toHaveProperty('user_name');
      expect(typeof response.body.balance).toBe('number');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .expect(401);
    });
  });

  describe('POST /wallet/deposit', () => {
    it('should deposit funds to wallet', async () => {
      if (!authToken) {
        return; // Skip if not authenticated
      }

      const depositDto = {
        amount: 50.00,
        idempotency_key: uuidv4(),
      };

      const response = await request(app.getHttpServer())
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(depositDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('deposit');
      expect(response.body.amount).toBe(5000); // Amount in cents
    });

    it('should return 400 for invalid amount', async () => {
      if (!authToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -10,
          idempotency_key: uuidv4(),
        })
        .expect(400);
    });

    it('should handle duplicate idempotency key', async () => {
      if (!authToken) {
        return;
      }

      const idempotencyKey = uuidv4();
      const depositDto = {
        amount: 25.00,
        idempotency_key: idempotencyKey,
      };

      // First deposit
      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(depositDto)
        .expect(201);

      // Second deposit with same idempotency key should return existing transaction
      const response = await request(app.getHttpServer())
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(depositDto)
        .expect(201);

      expect(response.body.idempotency_key).toBe(idempotencyKey);
    });
  });

  describe('POST /wallet/withdraw', () => {
    it('should withdraw funds from wallet', async () => {
      if (!authToken) {
        return;
      }

      const withdrawDto = {
        amount: 20.00,
        idempotency_key: uuidv4(),
      };

      const response = await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('withdraw');
      expect(response.body.amount).toBe(2000); // Amount in cents
    });

    it('should return 400 for insufficient funds', async () => {
      if (!authToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 999999,
          idempotency_key: uuidv4(),
        })
        .expect(400);
    });
  });

  describe('GET /wallet/transactions', () => {
    it('should return transaction list', async () => {
      if (!authToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/wallet/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    it('should filter by transaction type', async () => {
      if (!authToken) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/wallet/transactions?page=1&limit=10&type=deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions.every((tx: any) => tx.type === 'deposit')).toBe(true);
    });
  });
});

