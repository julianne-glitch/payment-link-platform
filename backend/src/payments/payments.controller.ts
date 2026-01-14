import {
  Body,
  Controller,
  Post,
  Get,
  Param,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  createPayment(
    @Body()
    body: {
      paymentLinkId: string;
      customerName: string;
      customerEmail: string;
      momoNumber: string;
      amount: number;
    },
  ) {
    return this.service.create(body);
  }

  @Get(':id')
  getPayment(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
