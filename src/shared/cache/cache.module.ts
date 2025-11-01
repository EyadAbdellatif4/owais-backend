import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from '../services/cache.service';

const logger = new Logger('CacheModule');

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST') || 'localhost';
        const redisPort = parseInt(configService.get<string>('REDIS_PORT') || '6379');
        const redisPassword = configService.get<string>('REDIS_PASSWORD') || undefined;
        const useRedis = configService.get<string>('USE_REDIS') !== 'false'; // Default to true
        
        // Try to use Redis if enabled, fall back to in-memory cache on failure
        if (useRedis) {
          try {
            const store = await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
                connectTimeout: 5000, // 5 second timeout
                reconnectStrategy: false, // Don't auto-reconnect on initial connection failure
              },
              password: redisPassword,
            });

            logger.log(`Redis cache connected successfully at ${redisHost}:${redisPort}`);
            
            return {
              store,
              ttl: parseInt(configService.get<string>('REDIS_TTL') || '300') * 1000, // Convert to milliseconds
            };
          } catch (error) {
            logger.warn(
              `Failed to connect to Redis at ${redisHost}:${redisPort}. Falling back to in-memory cache. Error: ${error.message}`,
            );
            logger.warn('To use Redis, make sure Redis server is running or set USE_REDIS=false in .env');
          }
        } else {
          logger.log('Redis cache is disabled. Using in-memory cache.');
        }

        // Fall back to in-memory cache (default NestJS cache)
        return {
          ttl: parseInt(configService.get<string>('REDIS_TTL') || '300') * 1000, // Convert to milliseconds
          max: parseInt(configService.get<string>('CACHE_MAX') || '100'), // Maximum number of items in cache
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}

