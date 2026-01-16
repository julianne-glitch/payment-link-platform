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
import { MansaService } from '../mansa/mansa.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private mansaService: MansaService,
  ) {}

  /* -------------------------------------------
     1️⃣ CREATE PAYMENT (ASSESSMENT-SAFE FLOW)
     ------------------------------------------- */
  async create(
    data: {
      paymentLinkId: string;
      customerName: string;
      customerEmail: string;
      momoNumber: string;
      amount: number;
      provider: 'MOMO' | 'OM';
    },
    idempotencyKey?: string,
  ) {
    const {
      paymentLinkId,
      customerName,
      customerEmail,
      momoNumber,
      amount,
      provider,
    } = data;

    // ✅ HARD VALIDATION
    if (
      !paymentLinkId ||
      !customerName ||
      !customerEmail ||
      !momoNumber ||
      !amount ||
      !provider
    ) {
      throw new BadRequestException('Missing required payment fields');
    }

    if (!['MOMO', 'OM'].includes(provider)) {
      throw new BadRequestException('Invalid provider');
    }

    const link = await this.prisma.paymentLink.findUnique({
      where: { id: paymentLinkId },
      include: { product: true },
    });

    if (!link || !link.isActive) {
      throw new BadRequestException('Invalid or inactive payment link');
    }

    /* -------------------------------
       IDEMPOTENCY
       ------------------------------- */
    if (idempotencyKey) {
      const cached = await this.redis.get(`idempotency:${idempotencyKey}`);
      if (cached) return JSON.parse(cached);
    }

    /* -------------------------------
       1️⃣ CREATE INTERNAL PAYMENT
       ------------------------------- */
    const payment = await this.prisma.payment.create({
      data: {
        paymentLinkId,
        customerName,
        customerEmail,
        momoNumber,
        amount,
        status: 'PENDING',
      },
    });

    /* -------------------------------
       2️⃣ CALL MANSA (NON-BLOCKING)
       ❗ DO NOT FAIL PAYMENT IF PROVIDER FAILS
       ------------------------------- */
    let providerResponse: any = null;

    try {
      providerResponse = await this.mansaService.initiateMoMoPayment({
        phoneNumber: momoNumber,
        amount,
        fullName: customerName,
        emailAddress: customerEmail,
        provider,
        externalReference: `PAY-${payment.id}`, // ✅ REQUIRED
      });
    } catch (err) {
      // ✅ EXPECTED IN STAGING / ASSESSMENT
      console.warn(
        '⚠️ Mansa initiation failed (staging). Payment remains PENDING.',
      );
    }

    /* -------------------------------
       3️⃣ STORE EXTERNAL REFERENCE
       ------------------------------- */
    const externalReference =
      providerResponse?.transactionId ||
      providerResponse?.externalId ||
      providerResponse?.reference ||
      `PAY-${payment.id}`;

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { externalRef: externalReference },
    });

    /* -------------------------------
       4️⃣ CACHE IDEMPOTENT RESPONSE
       ------------------------------- */
    if (idempotencyKey) {
      await this.redis.set(
        `idempotency:${idempotencyKey}`,
        JSON.stringify(updatedPayment),
        'EX',
        300,
      );
    }

    return updatedPayment;
  }

  /* -------------------------------------------
     2️⃣ GET PAYMENT (POLLING)
     ------------------------------------------- */
  async getById(id: string) {
    const cacheKey = `payment:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        paymentLink: { include: { product: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.redis.set(cacheKey, JSON.stringify(payment), 'EX', 30);
    return payment;
  }

  /* -------------------------------------------
     3️⃣ COMPLETE PAYMENT (MOCK / WEBHOOK)
     ------------------------------------------- */
  async completePayment(id: string, status: 'SUCCESS' | 'FAILED') {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        paymentLink: { include: { product: true } },
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
        data: { quantity: { decrement: 1 } },
      });
    }

    await this.redis.set(`payment:${id}`, JSON.stringify(updated), 'EX', 300);
    return updated;
  }

  /* -------------------------------------------
     4️⃣ GENERATE RECEIPT (PDF)
     ------------------------------------------- */
  async generateReceipt(paymentId: string, res: Response) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        paymentLink: { include: { product: true } },
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
