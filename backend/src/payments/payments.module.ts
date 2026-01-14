import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookController } from './payments.webhook.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [
    PaymentsController,
    PaymentsWebhookController,
  ],
  providers: [
    PaymentsService,
    PrismaService,
  ],
})
export class PaymentsModule {}
