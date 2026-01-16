import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Headers,
  Res,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

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
    provider: 'MOMO' | 'OM'; // ✅ REQUIRED
  },
) {
  return this.service.create(body, idempotencyKey);
}

  @Get(':id')
  getPayment(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/status')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: { status: 'SUCCESS' | 'FAILED' },
  ) {
    return this.service.completePayment(id, body.status);
  }

  @Get(':id/receipt')
  downloadReceipt(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.service.generateReceipt(id, res);
  }
}
