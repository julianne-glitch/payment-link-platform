import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PaymentLinksModule } from './payment-links/payment-links.module';
import { PrismaModule } from './prisma/prisma.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ✅ THIS FIXES .env LOADING
    PrismaModule,
    AuthModule,
    PaymentLinksModule,
    PaymentsModule,
  ],
})
export class AppModule {}
