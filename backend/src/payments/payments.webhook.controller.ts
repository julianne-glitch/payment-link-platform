import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('webhooks')
export class PaymentsWebhookController {
  constructor(private readonly service: PaymentsService) {}

  @Post('payments')
  markPaymentStatus(
    @Body()
    body: {
      paymentId: string;
      status: 'SUCCESS' | 'FAILED';
    },
  ) {
   return this.service.completePayment(body.paymentId, body.status);

  }
}
