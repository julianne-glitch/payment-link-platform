import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  MansaAuthResponse,
  MansaInitiateResponse,
} from './mansa.types';

@Injectable()
export class MansaService {
  private readonly baseUrl = process.env.MANSA_BASE_URL!;
  private readonly clientKey = process.env.MANSA_CLIENT_KEY!;
  private readonly clientSecret = process.env.MANSA_CLIENT_SECRET!;

  constructor(
    private readonly http: HttpService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async getAccessToken(): Promise<string> {
    const cached = await this.redis.get('mansa:token');
    if (cached) return cached;

    const data = await firstValueFrom(
      this.http
        .post<MansaAuthResponse>(
          `${this.baseUrl}/api/v1/xyz/authenticate`,
          {},
          {
            headers: {
              'client-key': this.clientKey,
              'client-secret': this.clientSecret,
            },
          },
        )
        .pipe(map(res => res.data)),
    );

    if (!data || !data.accessToken) {
      throw new InternalServerErrorException('Mansa auth failed');
    }

    await this.redis.set(
      'mansa:token',
      data.accessToken,
      'EX',
      data.expiresIn - 60,
    );

    return data.accessToken;
  }

  async initiatePayin(payload: {
    phoneNumber: string;
    amount: number;
    fullName: string;
    emailAddress: string;
  }): Promise<MansaInitiateResponse> {
    const token = await this.getAccessToken();

    const data = await firstValueFrom(
      this.http
        .post<MansaInitiateResponse>(
          `${this.baseUrl}/api/v1/xyz/initiate`,
          {
            paymentMode: 'MOMO',
            transactionType: 'payin',
            phoneNumber: payload.phoneNumber,
            amount: payload.amount,
            fullName: payload.fullName,
            emailAddress: payload.emailAddress,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'client-key': this.clientKey,
              'client-secret': this.clientSecret,
              'Content-Type': 'application/json',
            },
          },
        )
        .pipe(map(res => res.data)),
    );

    if (!data || !data.transactionReference) {
      throw new InternalServerErrorException(
        'Mansa initiation failed',
      );
    }

    return data;
  }
}
