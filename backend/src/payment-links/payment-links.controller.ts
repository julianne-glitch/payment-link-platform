
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payment-links')
export class PaymentLinksController {
  constructor(private readonly service: PaymentLinksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreatePaymentLinkDto) {
    return this.service.create(req.user.sub, dto.productId);
  }

  // ✅ ADD THIS
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }
}
