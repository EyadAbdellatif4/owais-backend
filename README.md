# Voucher Management System - Backend API

A comprehensive NestJS-based backend API for managing digital vouchers/gift cards with wallet functionality, order processing, and Stripe payment gateway integration.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Flow](#project-flow)
5. [Database Schema](#database-schema)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Endpoints](#api-endpoints)
8. [Caching Strategy](#caching-strategy)
9. [Stripe Integration](#stripe-integration)
10. [Environment Configuration](#environment-configuration)
11. [Setup & Installation](#setup--installation)
12. [Testing](#testing)

---

## 🎯 Project Overview

This is a **Voucher Management System** backend that allows:

- **User Management**: Registration, authentication with JWT
- **Role-Based Access Control**: Users (customers) and Merchants
- **Product Management**: Merchants can create/manage digital products (vouchers)
- **Wallet System**: Users can deposit/withdraw funds with idempotency protection
- **Order Processing**: Create orders with two payment methods:
  - **Wallet Payment**: Instant deduction from user's wallet
  - **Gateway Payment**: Stripe Checkout Session integration
- **Transaction Logging**: Comprehensive audit trail for all operations
- **Caching**: Redis-based caching with graceful fallback to in-memory

### Key Features

✅ JWT-based authentication  
✅ Role-based authorization (RBAC)  
✅ Digital wallet with deposit/withdraw  
✅ Product inventory management  
✅ Order processing with dual payment methods  
✅ Stripe payment gateway integration  
✅ Redis caching for performance  
✅ Transaction logging for audit  
✅ Idempotency for wallet transactions  
✅ Database transactions for data integrity  

---

## 🏗️ Architecture

### Modular Structure

The application follows NestJS modular architecture:

```
src/
├── auth/              # Authentication & Authorization
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.guard.ts      # JWT guard with role-based access
│   └── decorators/        # Custom decorators (@Public, @Roles, @CurrentUser)
│
├── users/             # User management (minimal - users created via auth)
│   └── users.controller.ts
│
├── role/              # Role management
│   └── role.controller.ts
│
├── wallet/            # Wallet & Transaction management
│   ├── wallet.controller.ts
│   ├── wallet.service.ts
│   └── entities/      # Wallet, WalletTransaction
│
├── product/           # Product management
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── entities/      # Product
│
├── order/             # Order processing
│   ├── order.controller.ts
│   ├── order.service.ts
│   └── entities/      # Order
│
├── payment/           # Payment gateway integration
│   ├── payment.controller.ts
│   └── services/
│       └── stripe.service.ts
│
└── shared/            # Shared utilities
    ├── cache/         # Redis caching module
    ├── database/      # Sequelize models & migrations
    ├── services/      # CacheService, TransactionLoggerService
    └── enums/         # Application enums
```

### Request Flow

```
Client Request
    ↓
AuthGuard (if not public)
    ↓
JWT Verification
    ↓
Role Check (if required)
    ↓
Controller
    ↓
Service (Business Logic)
    ↓
Database/External API (Stripe)
    ↓
Cache Update
    ↓
Response
```

---

## 🛠️ Technology Stack

### Core Framework
- **NestJS** (v11.0.1) - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Express** - HTTP server (via NestJS platform)

### Database
- **PostgreSQL** - Primary database
- **Sequelize** (v6.37.7) - ORM with TypeScript support
- **Sequelize-CLI** - Database migrations and seeders

### Authentication
- **Passport** - Authentication middleware
- **Passport-JWT** - JWT strategy
- **bcrypt** - Password hashing

### Caching
- **Redis** - Distributed caching (optional)
- **cache-manager** - Cache abstraction layer
- **cache-manager-redis-yet** - Redis store adapter

### Payment Gateway
- **Stripe** (v19.2.0) - Payment processing

### Other Libraries
- **class-validator** - DTO validation
- **class-transformer** - Object transformation
- **@nestjs/swagger** - API documentation
- **@nestjs/throttler** - Rate limiting

---

## 🔄 Project Flow

### 1. User Registration & Authentication Flow

```
1. User registers → POST /auth/register
   ├── Validates email uniqueness
   ├── Hashes password with bcrypt
   ├── Creates user with "user" role (default)
   ├── Initializes wallet with $0 balance
   └── Returns user data (without password)

2. User logs in → POST /auth/login
   ├── Validates credentials
   ├── Generates JWT token with:
   │   ├── sub: user.id
   │   ├── email: user.email
   │   ├── name: user.name
   │   └── role_id: user.role_id
   └── Returns JWT token + user data
```

### 2. Product Management Flow (Merchant Only)

```
1. Merchant creates product → POST /products
   ├── Validates merchant role
   ├── Creates product with:
   │   ├── name, price, availableUnits
   │   └── merchant_id (current user)
   ├── Invalidates product list cache
   └── Returns created product

2. View products → GET /products
   ├── Checks cache first
   ├── If cache miss: queries database
   ├── Stores in cache (5 min TTL)
   └── Returns product list

3. Update/Delete product
   ├── Verifies ownership (merchant_id match)
   ├── Updates/deletes product
   └── Invalidates relevant caches
```

### 3. Wallet Operations Flow

```
1. Deposit funds → POST /wallet/deposit
   ├── Starts database transaction
   ├── Checks idempotency key:
   │   ├── If exists with same params → returns existing transaction
   │   └── If exists with different params → 409 Conflict
   ├── Locks wallet row (UPDATE lock)
   ├── Updates balance (amount in cents)
   ├── Creates transaction record
   ├── Commits transaction
   ├── Invalidates wallet balance cache
   └── Returns transaction details

2. Withdraw funds → POST /wallet/withdraw
   ├── Similar to deposit
   ├── Additional check: sufficient balance
   └── Deducts from balance

3. Get balance → GET /wallet
   ├── Checks cache (2 min TTL)
   ├── If cache miss: queries database
   ├── Returns balance (converted from cents to dollars)
   └── Stores in cache
```

### 4. Order Processing Flow

#### A. Wallet Payment Flow

```
1. Create order → POST /orders (paymentMethod: "wallet")
   ├── Starts database transaction
   ├── Validates product exists and in stock
   ├── Creates order (status: "pending")
   ├── Logs order creation
   ├── Processes wallet payment:
   │   ├── Locks user wallet
   │   ├── Checks sufficient balance
   │   ├── Deducts amount from wallet
   │   ├── Creates wallet transaction record
   │   └── Logs wallet purchase
   ├── Decreases product stock
   ├── Updates order status to "completed"
   ├── Logs order completion
   ├── Commits transaction
   ├── Invalidates caches (orders, wallet balance)
   └── Returns completed order

2. Merchant gets credited:
   ├── For wallet payments: Merchant wallet credited immediately
   └── Transaction logged in merchant's wallet
```

#### B. Gateway Payment Flow (Stripe)

```
1. Create order → POST /orders (paymentMethod: "gateway")
   ├── Starts database transaction
   ├── Validates product exists and in stock
   ├── Creates order (status: "pending")
   ├── Creates Stripe Checkout Session:
   │   ├── Amount (converted to cents)
   │   ├── Currency (USD)
   │   ├── Metadata (orderId, productId, userId)
   │   ├── Success URL
   │   └── Cancel URL
   ├── Stores stripe_session_id in order
   ├── Logs payment initiation
   ├── Commits transaction
   └── Returns order with paymentSessionUrl

2. User completes payment on Stripe:
   ├── User redirected to Stripe checkout
   ├── User enters card details
   └── Stripe processes payment

3. Stripe webhook → POST /payment/stripe/webhook
   ├── Verifies webhook signature
   ├── Handles event: checkout.session.completed
   ├── Finds order by session ID
   ├── Verifies payment status
   ├── Completes order:
   │   ├── Decreases product stock
   │   ├── Updates order status to "completed"
   │   └── Credits merchant wallet
   ├── Logs all transactions
   └── Invalidates caches
```

### 5. Caching Flow

```
Request arrives
    ↓
Check cache (Redis or in-memory)
    ↓
Cache Hit? → Return cached data
    ↓
Cache Miss
    ↓
Query database
    ↓
Store in cache (with TTL)
    ↓
Return data

Cache Invalidation:
- Product create/update/delete → Invalidate product caches
- Wallet deposit/withdraw → Invalidate wallet balance cache
- Order create → Invalidate user orders cache
```

---

## 🗄️ Database Schema

### Tables

#### 1. `roles`
- `id` (UUID, PK)
- `name` (VARCHAR(50), UNIQUE) - 'user' or 'merchant'
- `is_active` (BOOLEAN)
- `createdAt`, `updatedAt`

#### 2. `users`
- `id` (UUID, PK)
- `email` (VARCHAR(50), UNIQUE)
- `password` (VARCHAR(255)) - bcrypt hashed
- `name` (VARCHAR(100))
- `role_id` (UUID, FK → roles.id)
- `is_active` (BOOLEAN)
- `createdAt`, `updatedAt`

#### 3. `wallets`
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id, UNIQUE)
- `balance` (BIGINT) - Stored in cents (e.g., $10.50 = 1050 cents)
- `createdAt`, `updatedAt`

#### 4. `wallet_transactions`
- `id` (UUID, PK)
- `wallet_id` (UUID, FK → wallets.id)
- `type` (ENUM) - 'deposit', 'withdraw', 'purchase'
- `amount` (BIGINT) - In cents
- `balance_before` (BIGINT)
- `balance_after` (BIGINT)
- `idempotency_key` (UUID, UNIQUE)
- `description` (TEXT)
- `metadata` (JSONB)
- `createdAt`, `updatedAt`

#### 5. `products`
- `id` (UUID, PK)
- `name` (VARCHAR(255))
- `price` (DECIMAL(10,2))
- `availableUnits` (INTEGER)
- `merchant_id` (UUID, FK → users.id)
- `createdAt`, `updatedAt`

#### 6. `orders`
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `product_id` (UUID, FK → products.id)
- `quantity` (INTEGER, default: 1)
- `total_amount` (DECIMAL(10,2))
- `payment_method` (ENUM) - 'wallet' or 'gateway'
- `status` (ENUM) - 'pending', 'completed', 'failed', 'cancelled'
- `gateway_transaction_id` (VARCHAR(255))
- `stripe_session_id` (VARCHAR(255))
- `stripe_payment_intent_id` (VARCHAR(255))
- `createdAt`, `updatedAt`

#### 7. `transaction_logs`
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `action_type` (VARCHAR(50)) - e.g., 'order_created', 'wallet_deposit'
- `entity_type` (VARCHAR(50)) - 'order', 'wallet', 'product'
- `entity_id` (UUID)
- `status` (VARCHAR(50))
- `details` (JSONB)
- `error_message` (TEXT)
- `ip_address` (VARCHAR(45))
- `createdAt`, `updatedAt`

### Relationships

```
users ←───┬─── wallets (1:1)
          │
          ├─── wallet_transactions (through wallets, 1:many)
          │
          ├─── products (as merchant, 1:many)
          │
          ├─── orders (as customer, 1:many)
          │
          └─── transaction_logs (1:many)

roles ←─── users (1:many)

products ←─── orders (1:many)
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role_id": "role-uuid",
  "role_name": "user",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Authentication Flow

1. **Public Endpoints**: Decorated with `@Public()` decorator
   - `/` (root)
   - `/health`
   - `/auth/register`
   - `/auth/login`
   - `/payment/stripe/webhook`

2. **Protected Endpoints**: Require `Authorization: Bearer <token>` header

3. **Role-Based Access**:
   - `@Roles(RoleName.MERCHANT)` - Only merchants can access
   - No decorator - Any authenticated user can access

### AuthGuard Process

```
Request arrives
    ↓
Check @Public() decorator
    ↓
If public → Allow
    ↓
Extract JWT token from Authorization header
    ↓
Verify token signature and expiration
    ↓
Extract payload (user ID, role_id)
    ↓
Get role from cache (1 hour TTL)
    ↓
If cache miss → Query database → Store in cache
    ↓
Check @Roles() decorator (if present)
    ↓
Verify user has required role
    ↓
Attach user object to request
    ↓
Allow request
```

---

## 📡 API Endpoints

**Base URL**: `http://localhost:3000`

### Health & Status

#### 1. GET `/`
Root endpoint - Simple hello message

**Authentication**: Not required

**Response** (200):
```json
"Hello World!"
```

---

#### 2. GET `/health`
Health check endpoint

**Authentication**: Not required

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

### Authentication

#### 3. POST `/auth/register`
Register a new user account

**Authentication**: Not required

**Rate Limit**: 3 requests per 60 seconds

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Rules**:
- `name`: String, 3-100 characters
- `email`: Valid email format, max 50 characters, must be unique
- `password`: String, 6-255 characters

**Response** (201):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role_id": "role-uuid",
    "is_active": true,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Responses**:
- `400`: Validation error
- `409`: Email already exists

---

#### 4. POST `/auth/login`
Authenticate user and receive JWT token

**Authentication**: Not required

**Rate Limit**: 5 requests per 60 seconds

**Request Body**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200):
```json
{
  "message": "User logged in successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwicm9sZV9pZCI6InJvbGUtdXVpZCIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoxNzA0MDcwODAwfQ.signature",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role_name": "user"
  }
}
```

**Error Responses**:
- `400`: Validation error
- `401`: Invalid credentials

**Usage**:
```bash
# Save token to variable
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use in subsequent requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/wallet
```

---

### Products

All product endpoints require authentication.

#### 5. POST `/products`
Create a new product (MERCHANT only)

**Authentication**: Required (Bearer token)

**Authorization**: MERCHANT role required

**Request Body**:
```json
{
  "name": "Gift Card $50",
  "price": 50.00,
  "availableUnits": 10
}
```

**Validation**:
- `name`: String, 1-255 characters, required
- `price`: Number, minimum 0.01, required
- `availableUnits`: Number, minimum 0, required

**Response** (201):
```json
{
  "id": "product-uuid",
  "name": "Gift Card $50",
  "price": 50.00,
  "availableUnits": 10,
  "merchant_id": "merchant-user-uuid",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `400`: Validation error
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (merchant role required)

**Example**:
```bash
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Gift Card",
    "price": 100.00,
    "availableUnits": 5
  }'
```

---

#### 6. GET `/products`
List all products

**Authentication**: Required (Bearer token)

**Response** (200):
```json
[
  {
    "id": "product-uuid-1",
    "name": "Gift Card $50",
    "price": 50.00,
    "availableUnits": 10,
    "merchant_id": "merchant-uuid",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  {
    "id": "product-uuid-2",
    "name": "Gift Card $100",
    "price": 100.00,
    "availableUnits": 0,
    "merchant_id": "merchant-uuid",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
]
```

**Note**: Products with `availableUnits = 0` are visible but not purchasable.

**Caching**: Results are cached for 5 minutes.

---

#### 7. GET `/products/:id`
Get product by ID

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (UUID v4) - Product ID

**Response** (200):
```json
{
  "id": "product-uuid",
  "name": "Gift Card $50",
  "price": 50.00,
  "availableUnits": 10,
  "merchant_id": "merchant-uuid",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `404`: Product not found

**Caching**: Product details cached for 10 minutes.

---

#### 8. PATCH `/products/:id`
Update product (MERCHANT owner only)

**Authentication**: Required (Bearer token)

**Authorization**: MERCHANT role + must be product owner

**URL Parameters**:
- `id` (UUID v4) - Product ID

**Request Body** (all fields optional):
```json
{
  "name": "Updated Gift Card $75",
  "price": 75.00,
  "availableUnits": 5
}
```

**Response** (200): Updated product object

**Error Responses**:
- `400`: Validation error
- `403`: Forbidden (not the product owner)
- `404`: Product not found

---

#### 9. DELETE `/products/:id`
Delete product (MERCHANT owner only)

**Authentication**: Required (Bearer token)

**Authorization**: MERCHANT role + must be product owner

**URL Parameters**:
- `id` (UUID v4) - Product ID

**Response** (200): Deleted product object

**Error Responses**:
- `403`: Forbidden (not the product owner)
- `404`: Product not found

---

### Orders

All order endpoints require authentication. Users can only see their own orders.

#### 10. POST `/orders`
Create a new order

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "productId": "product-uuid",
  "paymentMethod": "wallet"
}
```

**Validation**:
- `productId`: UUID v4, must exist
- `paymentMethod`: Enum - either `"wallet"` or `"gateway"`

**Response (201) - Wallet Payment**:
```json
{
  "id": "order-uuid",
  "user_id": "user-uuid",
  "product_id": "product-uuid",
  "quantity": 1,
  "total_amount": 50.00,
  "payment_method": "wallet",
  "status": "completed",
  "gateway_transaction_id": null,
  "stripe_session_id": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Response (201) - Gateway Payment**:
```json
{
  "id": "order-uuid",
  "user_id": "user-uuid",
  "product_id": "product-uuid",
  "quantity": 1,
  "total_amount": 50.00,
  "payment_method": "gateway",
  "status": "pending",
  "gateway_transaction_id": "cs_test_...",
  "stripe_session_id": "cs_test_...",
  "paymentSessionUrl": "https://checkout.stripe.com/pay/cs_test_...",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `400`: Validation error, insufficient funds, or product out of stock
- `404`: Product not found

**Example - Wallet Payment**:
```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid",
    "paymentMethod": "wallet"
  }'
```

**Example - Gateway Payment**:
```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid",
    "paymentMethod": "gateway"
  }'
# Response includes paymentSessionUrl - redirect user to this URL
```

---

#### 11. GET `/orders`
Get all orders for current user

**Authentication**: Required (Bearer token)

**Response** (200):
```json
[
  {
    "id": "order-uuid",
    "user_id": "user-uuid",
    "product_id": "product-uuid",
    "quantity": 1,
    "total_amount": 50.00,
    "payment_method": "wallet",
    "status": "completed",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
]
```

**Caching**: User orders cached for 3 minutes.

---

#### 12. GET `/orders/my-orders`
Same as GET `/orders` - alternative endpoint

**Authentication**: Required (Bearer token)

---

#### 13. GET `/orders/:id`
Get order by ID

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (UUID v4) - Order ID

**Response** (200): Order object

**Error Responses**:
- `404`: Order not found

---

#### 14. PATCH `/orders/:id`
Update order status

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `id` (UUID v4) - Order ID

**Request Body**:
```json
{
  "status": "completed"
}
```

**Possible Status Values**:
- `"pending"` - Order created, payment pending
- `"completed"` - Order paid and completed
- `"failed"` - Payment failed
- `"cancelled"` - Order cancelled

**Response** (200): Updated order object

**Error Responses**:
- `404`: Order not found

---

### Wallet

All wallet endpoints require authentication. Users can only manage their own wallet.

#### 15. POST `/wallet/deposit`
Deposit funds to wallet

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "amount": 100.50,
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Validation**:
- `amount`: Number, minimum 0.01 (in dollars)
- `idempotency_key`: UUID v4 (unique per transaction)

**Response** (200):
```json
{
  "id": "transaction-uuid",
  "type": "deposit",
  "amount": 100.50,
  "balance_before": 0.00,
  "balance_after": 100.50,
  "description": "Deposit of $100.50",
  "metadata": {
    "userId": "user-uuid",
    "amount": 100.50
  },
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Idempotency**: If the same `idempotency_key` is used with the same amount and type, the existing transaction is returned. If used with different parameters, returns 409 Conflict.

**Error Responses**:
- `400`: Invalid amount or idempotency key
- `409`: Idempotency key already used with different parameters

**Example**:
```bash
# Generate UUID for idempotency key
IDEMPOTENCY_KEY=$(node -e "console.log(require('crypto').randomUUID())")

curl -X POST http://localhost:3000/wallet/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 200.00,
    \"idempotency_key\": \"$IDEMPOTENCY_KEY\"
  }"
```

---

#### 16. POST `/wallet/withdraw`
Withdraw funds from wallet

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "amount": 50.00,
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (200): Transaction object (same format as deposit)

**Error Responses**:
- `400`: Invalid amount or insufficient funds
- `409`: Idempotency key already used with different parameters

---

#### 17. GET `/wallet`
Get current wallet balance

**Authentication**: Required (Bearer token)

**Response** (200):
```json
{
  "balance": 150.50,
  "user_email": "user@example.com",
  "user_name": "User Name"
}
```

**Note**: Balance is returned in dollars (stored as cents internally).

**Caching**: Balance cached for 2 minutes.

---

#### 18. GET `/wallet/transactions`
Get wallet transaction history

**Authentication**: Required (Bearer token)

**Query Parameters** (all optional):
- `type`: Filter by transaction type (`"deposit"` or `"withdraw"`)
- `limit`: Number of transactions to return (default: 10)
- `offset`: Number of transactions to skip (default: 0)

**Example**: `GET /wallet/transactions?type=deposit&limit=20&offset=0`

**Response** (200):
```json
{
  "transactions": [
    {
      "id": "transaction-uuid",
      "type": "deposit",
      "amount": 100.50,
      "balance_before": 0.00,
      "balance_after": 100.50,
      "description": "Deposit of $100.50",
      "metadata": {
        "userId": "user-uuid",
        "amount": 100.50
      },
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

---

### Payment

#### 19. POST `/payment/stripe/webhook`
Stripe webhook endpoint for payment confirmations

**Authentication**: Not required (uses Stripe signature verification)

**Request Headers**:
```
stripe-signature: t=1234567890,v1=signature...
```

**Request Body**: Raw JSON payload from Stripe (not parsed)

**Events Handled**:
- `checkout.session.completed` - Marks order as completed when payment succeeds
- `payment_intent.succeeded` - Alternative payment confirmation
- `payment_intent.payment_failed` - Marks order as failed

**Response** (200):
```json
{
  "received": true
}
```

**Error Responses**:
- `400`: Invalid webhook signature or payload

**Note**: This endpoint should be configured in Stripe Dashboard with your server URL.

---

#### 20. GET `/payment/stripe/session/:orderId`
Check Stripe payment session status

**Authentication**: Required (Bearer token)

**URL Parameters**:
- `orderId` (UUID v4) - Order ID

**Response** (200):
```json
{
  "orderId": "order-uuid",
  "sessionId": "cs_test_...",
  "paymentStatus": "paid",
  "sessionUrl": "https://checkout.stripe.com/pay/cs_test_..."
}
```

**Error Responses**:
- `400`: Order does not have a Stripe session
- `404`: Order not found

---

## 🚀 Caching Strategy

### Redis Configuration

The application uses Redis for distributed caching with graceful fallback to in-memory cache.

### Cache Configuration

**Environment Variables**:
```env
USE_REDIS=true              # Enable/disable Redis (default: true)
REDIS_HOST=localhost        # Redis host
REDIS_PORT=6379            # Redis port
REDIS_PASSWORD=            # Redis password (optional)
REDIS_TTL=300              # Default TTL in seconds (5 minutes)
CACHE_MAX=100              # Max items in in-memory cache
```

### Cached Data & TTL

| Data Type | Cache Key | TTL | Invalidation |
|-----------|-----------|-----|--------------|
| Product List | `products:list` | 5 min | On create/update/delete |
| Product Details | `product:{id}` | 10 min | On update/delete |
| Wallet Balance | `wallet:balance:{userId}` | 2 min | On deposit/withdraw/purchase |
| User Orders | `orders:user:{userId}` | 3 min | On order create |
| Role | `role:{roleId}` | 1 hour | Time-based expiration |

### Cache Flow

```
1. Request arrives
2. Check cache (Redis or in-memory)
3. If cache hit → Return cached data
4. If cache miss:
   a. Query database
   b. Store in cache with TTL
   c. Return data
5. On data modification:
   a. Update database
   b. Invalidate relevant cache keys
```

### Graceful Degradation

- If Redis is unavailable, falls back to in-memory cache
- Cache errors don't crash the application
- Application continues to work without cache (slower)

### Cache Service Methods

```typescript
// Get from cache
await cacheService.get<Type>(key)

// Set in cache
await cacheService.set(key, value, ttl)

// Delete from cache
await cacheService.delete(key)

// Invalidate by pattern
await cacheService.invalidatePattern(pattern)
```

---

## 💳 Stripe Integration

### Configuration

#### 1. Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...        # Stripe secret key (required for gateway payments)
STRIPE_WEBHOOK_SECRET=whsec_...      # Webhook signing secret (required for webhook verification)
STRIPE_API_VERSION=2024-11-20.acacia # Stripe API version (optional)
APP_URL=http://localhost:3000        # Base URL for redirect URLs
```

#### 2. Setup Steps

**Step 1: Get Stripe API Keys**
1. Sign up at https://stripe.com
2. Go to https://dashboard.stripe.com/test/apikeys
3. Copy your "Secret key" (starts with `sk_test_`)
4. Add to `.env` as `STRIPE_SECRET_KEY`

**Step 2: Configure Webhook**
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter webhook URL: `https://your-domain.com/payment/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy "Signing secret" (starts with `whsec_`)
6. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

**Step 3: Test Mode vs Production**
- Test mode keys: `sk_test_*`, `pk_test_*`
- Production keys: `sk_live_*`, `pk_live_*`
- This application is configured for **test mode only**

### Stripe Service

The `StripeService` handles:
- Creating Checkout Sessions
- Creating Payment Intents
- Retrieving sessions/payment intents
- Verifying webhook signatures

### Payment Flow (Gateway)

```
1. User creates order with paymentMethod: "gateway"
   ↓
2. System creates Stripe Checkout Session
   ├── Amount (converted to cents)
   ├── Currency (USD)
   ├── Metadata (orderId, productId, userId)
   ├── Success URL: {APP_URL}/orders/{orderId}/success
   └── Cancel URL: {APP_URL}/orders/{orderId}/cancel
   ↓
3. System stores stripe_session_id in order
   ↓
4. System returns order with paymentSessionUrl
   ↓
5. User redirected to Stripe checkout page
   ↓
6. User enters card details and completes payment
   ↓
7. Stripe processes payment
   ↓
8. Stripe sends webhook to /payment/stripe/webhook
   ├── Event: checkout.session.completed
   └── Signature verification
   ↓
9. System handles webhook:
   ├── Finds order by session ID
   ├── Verifies payment status
   ├── Completes order:
   │   ├── Decreases product stock
   │   ├── Updates order status to "completed"
   │   └── Credits merchant wallet
   └── Logs all transactions
```

### Webhook Signature Verification

All webhook requests are verified using Stripe's signature:

```typescript
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  webhookSecret
);
```

This ensures the webhook actually came from Stripe and wasn't tampered with.

### Test Cards

For testing in Stripe test mode, use these cards:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any future expiry date and any CVC.

---

## ⚙️ Environment Configuration

### Required Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_DATABASE=owais_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

### Optional Variables

```env
# Server
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Redis (Optional - defaults to in-memory if not configured)
USE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=300
CACHE_MAX=100

# Stripe (Optional - required for gateway payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-11-20.acacia

# Database SSL (Production only)
DB_SSL_CA=/path/to/ca-certificate.crt
```

### Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📦 Setup & Installation

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Redis (optional, for caching)
- npm or yarn

### Installation Steps

#### 1. Clone Repository

```bash
git clone <repository-url>
cd owais-backend
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

#### 4. Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed database (optional - creates roles and sample data)
npm run db:seed
```

#### 5. Start Development Server

```bash
npm run start:dev
```

Server will start on `http://localhost:3000` (or PORT from .env)

### Docker Setup (Alternative)

```bash
# Start all services (PostgreSQL, Redis, App)
docker-compose up

# Or run in background
docker-compose up -d

# Run migrations
docker-compose run --rm app npm run db:migrate

# Seed database
docker-compose run --rm app npm run db:seed

# View logs
docker-compose logs -f app
```

---

## 🧪 Testing

### Manual Testing

See `TESTING_INSTRUCTIONS.md` for step-by-step manual testing guide.

### Automated Testing Script

```bash
# Run automated endpoint tests
node test-all-endpoints.js
```

This script tests all endpoints in sequence and provides detailed output.

### Unit Tests

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e
```

### Testing Checklist

- [ ] Health check endpoints
- [ ] User registration and login
- [ ] JWT token authentication
- [ ] Wallet deposit/withdraw
- [ ] Product CRUD (as merchant)
- [ ] Order creation (wallet payment)
- [ ] Order creation (gateway payment)
- [ ] Stripe webhook handling
- [ ] Cache functionality
- [ ] Error handling
- [ ] Rate limiting

---

## 📝 Additional Resources

- **Endpoint Documentation**: `ENDPOINT_TESTING_GUIDE.md`
- **Quick Reference**: `ENDPOINTS_SUMMARY.md`
- **Testing Guide**: `TESTING_INSTRUCTIONS.md`
- **Environment Variables**: `ENV_VARIABLES.md`
- **Docker Setup**: `DOCKER_SETUP.md`

---

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: class-validator on all DTOs
- **SQL Injection Protection**: Sequelize ORM parameterized queries
- **Webhook Verification**: Stripe signature verification
- **Role-Based Access**: Prevents unauthorized actions
- **Idempotency**: Prevents duplicate transactions

---

## 📊 Rate Limits

- **Register**: 3 requests per 60 seconds
- **Login**: 5 requests per 60 seconds
- **Global**: 10 requests per 60 seconds

---

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Error**
- Check PostgreSQL is running
- Verify DB credentials in `.env`
- Ensure database exists

**2. Redis Connection Error**
- Check Redis is running (if USE_REDIS=true)
- App will fallback to in-memory cache
- Set `USE_REDIS=false` to disable Redis

**3. JWT Token Invalid**
- Token may have expired (default: 1 hour)
- Login again to get new token
- Verify JWT_SECRET matches

**4. 403 Forbidden (Product Creation)**
- User needs "merchant" role
- Update role in database:
  ```sql
  UPDATE users 
  SET role_id = (SELECT id FROM roles WHERE name = 'merchant') 
  WHERE email = 'user@example.com';
  ```

**5. Stripe Webhook Not Working**
- Verify webhook URL is correct in Stripe Dashboard
- Check STRIPE_WEBHOOK_SECRET matches
- Ensure webhook endpoint is publicly accessible

---

## 📄 License

This project is proprietary and confidential.

---

## 👥 Support

For issues or questions, please contact the development team.

---

**Last Updated**: 2024-01-01
