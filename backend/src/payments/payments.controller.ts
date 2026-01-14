import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // 1️⃣ Create payment (idempotent)
  @Post()
  createPayment(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body()
    body: {
      paymentLinkId: string;
      customerName: string;
      customerEmail: string;
      momoNumber: string;
      amount: number;
    },
  ) {
    return this.service.create(body, idempotencyKey);
  }

  // 2️⃣ Poll payment status
  @Get(':id')
  getPayment(@Param('id') id: string) {
    return this.service.getById(id);
  }

  // 3️⃣ Mock webhook — mark payment SUCCESS / FAILED
  @Post(':id/status')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: { status: 'SUCCESS' | 'FAILED' },
  ) {
    return this.service.updateStatus(id, body.status);
  }
}
