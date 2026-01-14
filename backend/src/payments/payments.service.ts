import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // 1️⃣ Create payment (PENDING)
  async create(data: {
    paymentLinkId: string;
    customerName: string;
    customerEmail: string;
    momoNumber: string;
    amount: number;
  }) {
    // Ensure payment link exists & is active
    const link = await this.prisma.paymentLink.findUnique({
      where: { id: data.paymentLinkId },
    });

    if (!link || !link.isActive) {
      throw new BadRequestException('Invalid or inactive payment link');
    }

    return this.prisma.payment.create({
      data: {
        paymentLinkId: data.paymentLinkId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        momoNumber: data.momoNumber,
        amount: data.amount,
        status: 'PENDING',
      },
    });
  }

  // 2️⃣ Get payment by ID (polling)
  async getById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // 3️⃣ Update payment status (mock webhook)
  async updateStatus(id: string, status: 'SUCCESS' | 'FAILED') {
    return this.prisma.payment.update({
      where: { id },
      data: {
        status,
      },
    });
  }
}
