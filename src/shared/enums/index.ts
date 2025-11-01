/**
 * Role Names enum
 */
export enum RoleName {
  MERCHANT = 'merchant',
  USER = 'user',
}

/**
 * Payment Method enum
 */
export enum PaymentMethod {
  WALLET = 'wallet',
  GATEWAY = 'gateway',
}

/**
 * Order Status enum
 */
export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Transaction Action Type enum for logging
 */
export enum TransactionActionType {
  ORDER_CREATED = 'order_created',
  ORDER_COMPLETED = 'order_completed',
  ORDER_FAILED = 'order_failed',
  ORDER_CANCELLED = 'order_cancelled',
  WALLET_PURCHASE = 'wallet_purchase',
  WALLET_DEPOSIT = 'wallet_deposit',
  WALLET_WITHDRAW = 'wallet_withdraw',
  PRODUCT_STOCK_DECREASED = 'product_stock_decreased',
  GATEWAY_PAYMENT_INITIATED = 'gateway_payment_initiated',
  GATEWAY_PAYMENT_COMPLETED = 'gateway_payment_completed',
  GATEWAY_PAYMENT_FAILED = 'gateway_payment_failed',
}

/**
 * Response Messages enum
 */
export enum ResponseMessage {
  // Auth
  USER_REGISTERED = 'User registered successfully',
  USER_LOGGED_IN = 'User logged in successfully',
  
  // Users
  USER_CREATED = 'User created successfully',
  USER_UPDATED = 'User updated successfully',
  USER_DELETED = 'User deactivated successfully',
  USER_RETRIEVED = 'User retrieved successfully',
  USERS_RETRIEVED = 'Users retrieved successfully',
  
  // Roles
  ROLE_CREATED = 'Role created successfully',
  ROLE_UPDATED = 'Role updated successfully',
  ROLE_DELETED = 'Role deactivated successfully',
  ROLE_RETRIEVED = 'Role retrieved successfully',
  ROLES_RETRIEVED = 'Roles retrieved successfully',
}

/**
 * Default Values enum
 */
export const DefaultValues = {
  IS_ACTIVE: true,
  IS_INACTIVE: false,
} as const;

/**
 * Validation Patterns enum
 */
export enum ValidationPattern {
  NAME = '^[a-zA-Z\\s]+$',
  ROLE_NAME = '^[a-zA-Z_]+$',
}

/**
 * Error Messages enum
 */
export enum ErrorMessage {
  // Validation
  NAME_REQUIRED = 'Name is required',
  EMAIL_REQUIRED = 'Email is required',
  PASSWORD_REQUIRED = 'Password is required',
  ROLE_NAME_REQUIRED = 'Role name is required',
  
  // Type validation
  NAME_MUST_BE_STRING = 'Name must be a string',
  EMAIL_MUST_BE_STRING = 'Email must be a string',
  PASSWORD_MUST_BE_STRING = 'Password must be a string',
  ROLE_NAME_MUST_BE_STRING = 'Role name must be a string',
  
  // Length validation
  NAME_MIN_LENGTH = 'Name must be at least 3 characters long',
  NAME_MAX_LENGTH = 'Name cannot exceed 100 characters',
  EMAIL_MAX_LENGTH = 'Email cannot exceed 50 characters',
  PASSWORD_MIN_LENGTH = 'Password must be at least 6 characters long',
  PASSWORD_MAX_LENGTH = 'Password cannot exceed 255 characters',
  ROLE_NAME_MIN_LENGTH = 'Role name must be at least 2 characters long',
  ROLE_NAME_MAX_LENGTH = 'Role name cannot exceed 50 characters',
  
  // Format validation
  EMAIL_INVALID = 'Please provide a valid email address',
  
  // Not Found
  USER_NOT_FOUND = 'User not found',
  ROLE_NOT_FOUND = 'Role not found',
  DEFAULT_USER_ROLE_NOT_FOUND = 'Default user role not found',
  
  // Conflicts
  EMAIL_EXISTS = 'User with this email already exists',
  NAME_EMAIL_EXISTS = 'User with this email or name already exists',
  ROLE_NAME_EXISTS = 'Role with this name already exists',
  
  // Authentication
  ACCESS_TOKEN_REQUIRED = 'Access token is required',
  INVALID_USER_ROLE = 'Invalid user role',
  INSUFFICIENT_PERMISSIONS = 'Insufficient permissions',
  INVALID_CREDENTIALS = 'Invalid credentials',
  INVALID_OR_EXPIRED_TOKEN = 'Invalid or expired token',
}
