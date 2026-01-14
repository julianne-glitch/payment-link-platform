import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentLinksService {
  constructor(private prisma: PrismaService) {}

  // 🔐 Create payment link
  async create(merchantId: string, productId: string) {
    // 1️⃣ Verify product belongs to merchant
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        merchantId,
      },
    });

    if (!product) {
      throw new BadRequestException(
        'Product not found or does not belong to merchant',
      );
    }

    // 2️⃣ Generate slug
    const slug = randomUUID().slice(0, 8);

    // 3️⃣ Create payment link
    return this.prisma.paymentLink.create({
      data: {
        merchantId,
        productId,
        slug,
      },
    });
  }

  // 🌍 PUBLIC – Get payment link by slug
  async getBySlug(slug: string) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { slug },
      include: {
        product: true,
      },
    });

    if (!link || !link.isActive) {
      throw new BadRequestException('Payment link not found');
    }

    return {
      id: link.id,
      slug: link.slug,
      product: {
        title: link.product.title,
        description: link.product.description,
        price: link.product.price,
        imageUrl: link.product.imageUrl,
        supportEmail: link.product.supportEmail,
        supportPhone: link.product.supportPhone,
      },
    };
  }
}
