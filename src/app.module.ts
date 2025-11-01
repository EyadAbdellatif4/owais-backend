import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { SequelizeModule } from '@nestjs/sequelize';
import * as fs from 'fs';
import { APP_GUARD } from '@nestjs/core';
import { RoleModule } from './role/role.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { CacheModule } from './shared/cache/cache.module';
import databaseModels from './shared/database/databaseModel';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        dialectOptions: {
          ssl:
            configService.get('NODE_ENV') === 'development'
              ? false
              : {
                  require: true,
                  rejectUnauthorized: false,
                  ca: configService.get<string>('DB_SSL_CA')
                    ? fs
                        .readFileSync(configService.get<string>('DB_SSL_CA')!)
                        .toString()
                    : undefined,
                },
        },
        models: databaseModels(),
        force: false,
      }),
      inject: [ConfigService],
    }),
    RoleModule,
    UsersModule,
    AuthModule,
    WalletModule,
    ProductModule,
    OrderModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerModule,
    },
  ],
})
export class AppModule {}
