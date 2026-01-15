import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  /* -------------------------------------------
     1️⃣ CREATE PAYMENT (PENDING + IDEMPOTENCY)
     ------------------------------------------- */
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
    const link = await this.prisma.paymentLink.findUnique({
      where: { id: data.paymentLinkId },
      include: { product: true },
    });

    if (!link || !link.isActive) {
      throw new BadRequestException('Invalid or inactive payment link');
    }

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

      await this.redis.set(cacheKey, JSON.stringify(payment), 'EX', 300);
      return payment;
    }

    return this.prisma.payment.create({
      data: {
        ...data,
        status: 'PENDING',
      },
    });
  }

  /* -------------------------------------------
     2️⃣ GET PAYMENT (POLLING + REDIS CACHE)
     ------------------------------------------- */
  async getById(id: string) {
    const cacheKey = `payment:${id}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        paymentLink: {
          include: { product: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.redis.set(cacheKey, JSON.stringify(payment), 'EX', 30);
    return payment;
  }

  /* -------------------------------------------
     3️⃣ COMPLETE PAYMENT (PROVIDER RESULT)
     ------------------------------------------- */
  async completePayment(id: string, status: 'SUCCESS' | 'FAILED') {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        paymentLink: {
          include: { product: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment already finalized');
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status },
    });

    if (
      status === 'SUCCESS' &&
      payment.paymentLink.product.quantity !== null
    ) {
      if (payment.paymentLink.product.quantity <= 0) {
        throw new BadRequestException('Product out of stock');
      }

      await this.prisma.product.update({
        where: { id: payment.paymentLink.product.id },
        data: {
          quantity: { decrement: 1 },
        },
      });
    }

    await this.redis.set(
      `payment:${id}`,
      JSON.stringify(updated),
      'EX',
      300,
    );

    return updated;
  }

  /* -------------------------------------------
     4️⃣ GENERATE RECEIPT (PDF)
     ------------------------------------------- */
  async generateReceipt(paymentId: string, res: Response) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        paymentLink: {
          include: { product: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'SUCCESS') {
      throw new BadRequestException(
        'Receipt available only for successful payments',
      );
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=receipt-${payment.id}.pdf`,
    );

    doc.pipe(res);

    doc.fontSize(20).text('Payment Receipt', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Receipt ID: ${payment.id}`);
    doc.text(`Date: ${payment.createdAt.toISOString()}`);
    doc.moveDown();

    doc.text(`Customer Name: ${payment.customerName}`);
    doc.text(`Customer Email: ${payment.customerEmail}`);
    doc.text(`Phone Number: ${payment.momoNumber}`);
    doc.moveDown();

    doc.text(`Product: ${payment.paymentLink.product.title}`);
    doc.text(`Amount Paid: ${payment.amount}`);
    doc.text(`Payment Status: ${payment.status}`);
    doc.moveDown();

    doc.text('Thank you for your payment!', { align: 'center' });

    doc.end();
  }
}
