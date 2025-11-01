import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhook signature verification
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
