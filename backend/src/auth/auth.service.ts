import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const merchant = await this.prisma.merchant.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    return { id: merchant.id, email: merchant.email };
  }

  async login(email: string, password: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { email },
    });

    if (!merchant) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, merchant.password);
    if (!valid) throw new UnauthorizedException();

    const token = this.jwtService.sign({
      sub: merchant.id,
      email: merchant.email,
    });

    return { access_token: token };
  }
}
