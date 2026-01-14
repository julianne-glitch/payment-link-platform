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

  @Get(':id')
  getPayment(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
