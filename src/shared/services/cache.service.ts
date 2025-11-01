import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      // Gracefully handle cache errors (e.g., Redis connection lost)
      console.warn(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      // Gracefully handle cache errors (e.g., Redis connection lost)
      console.warn(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      // Gracefully handle cache errors (e.g., Redis connection lost)
      console.warn(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   * Note: Cache manager v5+ doesn't have reset method, using del with pattern matching instead
   */
  async reset(): Promise<void> {
    // For Redis, we can use pattern matching to clear all keys
    await this.invalidatePattern('*');
  }

  /**
   * Invalidate cache by pattern
   * Note: Redis keys command for pattern matching
   * This is a best-effort implementation for pattern-based cache invalidation
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Access Redis client through stores array (cache-manager v5+ structure)
      const stores = (this.cacheManager as any).stores;
      if (stores && stores.length > 0) {
        const store = stores[0];
        
        // Try different paths to access Redis client
        let client: any = null;
        
        // Path 1: Direct client access
        if (store.client) {
          client = store.client;
        }
        // Path 2: Through namespace
        else if (store.namespace && store.namespace.client) {
          client = store.namespace.client;
        }
        // Path 3: Through internal structure
        else if (store.opts && store.opts.client) {
          client = store.opts.client;
        }
        
        if (client) {
          const keys = await client.keys(pattern);
          if (keys && keys.length > 0) {
            // Delete in batches if too many keys
            if (keys.length > 100) {
              for (let i = 0; i < keys.length; i += 100) {
                const batch = keys.slice(i, i + 100);
                await client.del(...batch);
              }
            } else {
              await client.del(...keys);
            }
          }
        }
      }
    } catch (error) {
      // Silently fail pattern invalidation if Redis client is not accessible
      // Individual key deletion will still work
      console.warn('Pattern-based cache invalidation failed:', error);
    }
  }

  /**
   * Cache key helpers
   */
  static getProductListKey(): string {
    return 'products:list';
  }

  static getProductKey(id: string): string {
    return `product:${id}`;
  }

  static getRoleKey(roleId: string): string {
    return `role:${roleId}`;
  }

  static getWalletBalanceKey(userId: string): string {
    return `wallet:balance:${userId}`;
  }

  static getOrdersUserKey(userId: string): string {
    return `orders:user:${userId}`;
  }

  static getOrderKey(orderId: string): string {
    return `orders:${orderId}`;
  }
}

