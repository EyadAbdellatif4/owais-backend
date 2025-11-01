/**
 * Complete API Endpoint Testing Script
 * 
 * This script tests all endpoints in the Voucher Management System.
 * 
 * Usage:
 *   1. Make sure the server is running: npm run start:dev
 *   2. Run this script: node test-all-endpoints.js
 * 
 * Prerequisites:
 *   - Server running on http://localhost:3000
 *   - Node.js installed
 *   - No need to install additional packages (uses native fetch in Node 18+)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
let authToken = null;
let userId = null;
let merchantToken = null;
let merchantId = null;
let productId = null;
let orderId = null;
let walletBalance = 0;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper function to print colored output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to make HTTP requests
async function request(method, endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers,
    },
    ...(options.body && { body: JSON.stringify(options.body) }),
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null,
    };
  }
}

// Test function wrapper
async function test(name, testFn) {
  try {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`Testing: ${name}`, 'bright');
    log('='.repeat(60), 'cyan');
    await testFn();
    log(`✓ ${name} - PASSED`, 'green');
  } catch (error) {
    log(`✗ ${name} - FAILED: ${error.message}`, 'red');
    throw error;
  }
}

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runAllTests() {
  log('\n🚀 Starting API Endpoint Tests', 'bright');
  log(`Base URL: ${BASE_URL}\n`, 'cyan');

  try {
    // ========================================================================
    // 1. HEALTH & STATUS ENDPOINTS
    // ========================================================================
    
    await test('GET / - Root endpoint', async () => {
      const response = await request('GET', '/');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      log(`  Response: ${response.data}`, 'yellow');
    });

    await test('GET /health - Health check', async () => {
      const response = await request('GET', '/health');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      if (!response.data.status || response.data.status !== 'ok') {
        throw new Error('Health check failed');
      }
      log(`  Status: ${response.data.status}`, 'yellow');
      log(`  Timestamp: ${response.data.timestamp}`, 'yellow');
    });

    // ========================================================================
    // 2. AUTHENTICATION ENDPOINTS
    // ========================================================================

    await test('POST /auth/register - Register regular user', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const response = await request('POST', '/auth/register', {
        body: {
          name: 'Test User',
          email: email,
          password: 'TestPassword123!',
        },
      });

      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      userId = response.data.user?.id;
      log(`  User registered: ${email}`, 'yellow');
      log(`  User ID: ${userId}`, 'yellow');
    });

    await test('POST /auth/register - Register merchant user', async () => {
      const email = `merchant_${Date.now()}@example.com`;
      const response = await request('POST', '/auth/register', {
        body: {
          name: 'Merchant User',
          email: email,
          password: 'MerchantPassword123!',
        },
      });

      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      merchantId = response.data.user?.id;
      log(`  Merchant registered: ${email}`, 'yellow');
      log(`  Merchant ID: ${merchantId}`, 'yellow');
      
      // Note: In a real scenario, you'd need to assign merchant role via admin panel
      // For now, we'll assume the first registered user can be promoted to merchant
      // This might require manual database update or an admin endpoint
    });

    await test('POST /auth/login - Login regular user', async () => {
      const email = `testuser_${Date.now() - 1000}@example.com`;
      // First register
      await request('POST', '/auth/register', {
        body: {
          name: 'Test User',
          email: email,
          password: 'TestPassword123!',
        },
      });

      // Then login
      const response = await request('POST', '/auth/login', {
        body: {
          email: email,
          password: 'TestPassword123!',
        },
      });

      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      if (!response.data.access_token) {
        throw new Error('No access token received');
      }
      authToken = response.data.access_token;
      userId = response.data.user?.id;
      log(`  Token received: ${authToken.substring(0, 20)}...`, 'yellow');
      log(`  User ID: ${userId}`, 'yellow');
    });

    // ========================================================================
    // 3. WALLET ENDPOINTS
    // ========================================================================

    await test('GET /wallet - Get wallet balance (initial)', async () => {
      const response = await request('GET', '/wallet');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      walletBalance = response.data.balance || 0;
      log(`  Balance: $${walletBalance}`, 'yellow');
    });

    await test('POST /wallet/deposit - Deposit funds', async () => {
      const idempotencyKey = generateUUID();
      const response = await request('POST', '/wallet/deposit', {
        body: {
          amount: 200.50,
          idempotency_key: idempotencyKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      walletBalance = response.data.balance_after;
      log(`  Deposited: $${response.data.amount}`, 'yellow');
      log(`  New Balance: $${walletBalance}`, 'yellow');
    });

    await test('POST /wallet/withdraw - Withdraw funds', async () => {
      const idempotencyKey = generateUUID();
      const response = await request('POST', '/wallet/withdraw', {
        body: {
          amount: 50.00,
          idempotency_key: idempotencyKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
      walletBalance = response.data.balance_after;
      log(`  Withdrawn: $${response.data.amount}`, 'yellow');
      log(`  New Balance: $${walletBalance}`, 'yellow');
    });

    await test('GET /wallet - Get wallet balance (after transactions)', async () => {
      const response = await request('GET', '/wallet');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      log(`  Current Balance: $${response.data.balance}`, 'yellow');
    });

    await test('GET /wallet/transactions - Get transaction history', async () => {
      const response = await request('GET', '/wallet/transactions');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      log(`  Total transactions: ${response.data.total || response.data.transactions?.length || 0}`, 'yellow');
      if (response.data.transactions && response.data.transactions.length > 0) {
        log(`  Latest transaction type: ${response.data.transactions[0].type}`, 'yellow');
        log(`  Latest transaction amount: $${response.data.transactions[0].amount}`, 'yellow');
      }
    });

    await test('GET /wallet/transactions?type=deposit - Filter deposits', async () => {
      const response = await request('GET', '/wallet/transactions?type=deposit');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      log(`  Deposit transactions: ${response.data.total || response.data.transactions?.length || 0}`, 'yellow');
    });

    // ========================================================================
    // 4. PRODUCT ENDPOINTS
    // ========================================================================

    // Note: Product creation requires MERCHANT role
    // We'll test viewing first, then note that creation might fail without merchant role
    
    await test('GET /products - List all products', async () => {
      const response = await request('GET', '/products');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      log(`  Products found: ${response.data.length || 0}`, 'yellow');
      if (response.data.length > 0) {
        productId = response.data[0].id;
        log(`  First product: ${response.data[0].name}`, 'yellow');
      }
    });

    // Try to create product (might fail if user doesn't have merchant role)
    await test('POST /products - Create product (may fail without merchant role)', async () => {
      const response = await request('POST', '/products', {
        body: {
          name: `Test Product ${Date.now()}`,
          price: 25.99,
          availableUnits: 5,
        },
      });

      if (response.ok) {
        productId = response.data.id;
        log(`  ✓ Product created: ${response.data.name}`, 'green');
        log(`  Product ID: ${productId}`, 'yellow');
      } else if (response.status === 403) {
        log(`  ⚠ Creation requires MERCHANT role (expected)`, 'yellow');
        log(`  Response: ${JSON.stringify(response.data)}`, 'yellow');
        // Use existing product ID if available
      } else {
        throw new Error(`Unexpected status ${response.status}: ${JSON.stringify(response.data)}`);
      }
    });

    if (productId) {
      await test('GET /products/:id - Get product by ID', async () => {
        const response = await request('GET', `/products/${productId}`);
        if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
        log(`  Product: ${response.data.name}`, 'yellow');
        log(`  Price: $${response.data.price}`, 'yellow');
        log(`  Available: ${response.data.availableUnits}`, 'yellow');
      });
    }

    // ========================================================================
    // 5. ORDER ENDPOINTS
    // ========================================================================

    if (productId) {
      await test('POST /orders - Create order with wallet payment', async () => {
        const response = await request('POST', '/orders', {
          body: {
            productId: productId,
            paymentMethod: 'wallet',
          },
        });

        if (response.status === 400) {
          // Might fail if insufficient funds or out of stock
          log(`  ⚠ Order creation failed: ${JSON.stringify(response.data)}`, 'yellow');
          log(`  This is acceptable if product is out of stock or insufficient funds`, 'yellow');
        } else if (!response.ok) {
          throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
        } else {
          orderId = response.data.id;
          log(`  ✓ Order created: ${response.data.id}`, 'green');
          log(`  Status: ${response.data.status}`, 'yellow');
          log(`  Total: $${response.data.total_amount}`, 'yellow');
        }
      });
    } else {
      log(`\n⚠ Skipping order tests - no product available`, 'yellow');
    }

    await test('GET /orders - List my orders', async () => {
      const response = await request('GET', '/orders');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      log(`  Orders found: ${response.data.length || 0}`, 'yellow');
      if (response.data.length > 0 && !orderId) {
        orderId = response.data[0].id;
        log(`  Using first order ID: ${orderId}`, 'yellow');
      }
    });

    await test('GET /orders/my-orders - List my orders (alternative endpoint)', async () => {
      const response = await request('GET', '/orders/my-orders');
      if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
      log(`  Orders found: ${response.data.length || 0}`, 'yellow');
    });

    if (orderId) {
      await test('GET /orders/:id - Get order by ID', async () => {
        const response = await request('GET', `/orders/${orderId}`);
        if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
        log(`  Order ID: ${response.data.id}`, 'yellow');
        log(`  Status: ${response.data.status}`, 'yellow');
        log(`  Payment Method: ${response.data.payment_method}`, 'yellow');
      });
    }

    // ========================================================================
    // 6. PAYMENT ENDPOINTS
    // ========================================================================

    if (orderId) {
      await test('GET /payment/stripe/session/:orderId - Check Stripe session (may fail)', async () => {
        const response = await request('GET', `/payment/stripe/session/${orderId}`);
        if (response.status === 400) {
          log(`  ⚠ Order doesn't have Stripe session (expected for wallet payments)`, 'yellow');
        } else if (!response.ok) {
          log(`  ⚠ Status ${response.status}: ${JSON.stringify(response.data)}`, 'yellow');
        } else {
          log(`  ✓ Stripe session found`, 'green');
          log(`  Payment Status: ${response.data.paymentStatus}`, 'yellow');
        }
      });
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================

    log('\n' + '='.repeat(60), 'cyan');
    log('✅ ALL TESTS COMPLETED!', 'bright');
    log('='.repeat(60), 'cyan');
    log('\n📊 Test Summary:', 'bright');
    log(`  - Base URL: ${BASE_URL}`, 'cyan');
    log(`  - User ID: ${userId || 'N/A'}`, 'cyan');
    log(`  - Product ID: ${productId || 'N/A'}`, 'cyan');
    log(`  - Order ID: ${orderId || 'N/A'}`, 'cyan');
    log(`  - Wallet Balance: $${walletBalance}`, 'cyan');
    log('\n💡 Note: Some endpoints may show warnings if they require specific roles or configurations.', 'yellow');
    log('   This is expected behavior. Check the output above for details.\n', 'yellow');

  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('❌ TEST SUITE FAILED', 'bright');
    log('='.repeat(60), 'red');
    log(`\nError: ${error.message}`, 'red');
    log(`\nStack: ${error.stack}`, 'red');
    process.exit(1);
  }
}

// Run the tests
if (typeof fetch === 'undefined') {
  // For Node.js < 18, we'd need to use a library like node-fetch
  log('⚠ Error: This script requires Node.js 18+ (which includes native fetch)', 'red');
  log('   Alternatively, install node-fetch: npm install node-fetch@2', 'yellow');
  log('   Then modify the script to import it.', 'yellow');
  process.exit(1);
}

runAllTests().catch(console.error);

