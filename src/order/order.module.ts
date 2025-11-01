import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { TransactionLog } from '../shared/database/entities/transaction-log.entity';
import { ProductModule } from '../product/product.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentModule } from '../payment/payment.module';
import { TransactionLoggerService } from '../shared/services/transaction-logger.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Order,
      Product,
      User,
      Wallet,
      WalletTransaction,
      TransactionLog,
    ]),
    ProductModule,
    WalletModule,
    forwardRef(() => PaymentModule), // Use forwardRef to avoid circular dependency
    AuthModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, TransactionLoggerService],
  exports: [OrderService],
})
export class OrderModule {}

