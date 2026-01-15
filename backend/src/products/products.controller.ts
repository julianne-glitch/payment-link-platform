import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createProduct(
    @Req() req,
    @Body()
    body: {
      title: string;
      description?: string;
      imageUrl: string;
      price: number;
      quantity?: number;
      supportEmail: string;
      supportPhone: string;
    },
  ) {
    return this.service.create(req.user.sub, body);
  }
}
