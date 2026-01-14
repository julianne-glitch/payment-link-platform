import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  // 1️⃣ Create payment (PENDING) with idempotency
  async create(
    data: {
      paymentLinkId: string;
      customerName: string;
      customerEmail: string;
      momoNumber: string;
      amount: number;
    },
    idempotencyKey?: string,
  ) {
    //  Ensure payment link exists & is active
    const link = await this.prisma.paymentLink.findUnique({
      where: { id: data.paymentLinkId },
    });

    if (!link || !link.isActive) {
      throw new BadRequestException('Invalid or inactive payment link');
    }

    // 🔁 IDEMPOTENCY (if key provided)
    if (idempotencyKey) {
      const cacheKey = `idempotency:${idempotencyKey}`;

      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const payment = await this.prisma.payment.create({
        data: {
          ...data,
          status: 'PENDING',
        },
      });

      await this.redis.set(
        cacheKey,
        JSON.stringify(payment),
        'EX',
        300, // 5 minutes
      );

      return payment;
    }

    // Fallback (no idempotency key)
    return this.prisma.payment.create({
      data: {
        ...data,
        status: 'PENDING',
      },
    });
  }

  // 2️⃣ Get payment by ID (polling with Redis cache)
  async getById(id: string) {
    const cacheKey = `payment_status:${id}`;

    const cachedStatus = await this.redis.get(cacheKey);
    if (cachedStatus) {
      return { status: cachedStatus };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.redis.set(
      cacheKey,
      payment.status,
      'EX',
      60, // 1 minute
    );

    return payment;
  }

  // 3️⃣ Update payment status (mock webhook)
  async updateStatus(id: string, status: 'SUCCESS' | 'FAILED') {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: { status },
    });

    //  Update Redis cache
    await this.redis.set(
      `payment_status:${id}`,
      status,
      'EX',
      60,
    );

    return payment;
  }
}
