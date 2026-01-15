import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(
    merchantId: string,
    data: {
      title: string;
      description?: string;
      imageUrl: string;
      price: number;
      quantity?: number;
      supportEmail: string;
      supportPhone: string;
    },
  ) {
    return this.prisma.product.create({
      data: {
        merchantId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        quantity: data.quantity ?? null, // null = unlimited
        supportEmail: data.supportEmail,
        supportPhone: data.supportPhone,
      },
    });
  }
}
