import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './services/stripe.service';
import { PaymentController } from './payment.controller';
import { WalletModule } from '../wallet/wallet.module';
import { OrderModule } from '../order/order.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    WalletModule,
    AuthModule, // Required for AuthGuard used in PaymentController
    forwardRef(() => OrderModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [PaymentController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentModule {}

