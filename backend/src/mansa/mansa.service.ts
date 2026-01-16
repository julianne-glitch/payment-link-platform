import { Injectable, Inject, HttpException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import Redis from 'ioredis';

@Injectable()
export class MansaService {
  private readonly baseUrl = process.env.MANSA_BASE_URL as string;
  private readonly clientKey = process.env.MANSA_CLIENT_KEY as string;
  private readonly clientSecret = process.env.MANSA_CLIENT_SECRET as string;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /* -------------------------------------------
     🔐 AUTHENTICATE (GET & CACHE JWT TOKEN)
     ------------------------------------------- */
  private async authenticate(): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/api/v1/xyz/authenticate`,
      {},
      {
        headers: {
          'client-key': this.clientKey,
          'client-secret': this.clientSecret,
        },
      },
    );

    const token = response.data?.token as string;

    if (!token) {
      throw new Error('Failed to authenticate with Mansa');
    }

    // ✅ Cache token for 50 minutes
    await this.redis.set('mansa_token', token, 'EX', 50 * 60);

    return token;
  }

  /* -------------------------------------------
     📲 INITIATE MOMO / OM PAYMENT
     (WITH AUTO TOKEN REFRESH)
     ------------------------------------------- */
  async initiateMoMoPayment(data: {
    phoneNumber: string;
    amount: number;
    fullName: string;
    emailAddress: string;
    provider: 'MOMO' | 'OM';
    externalReference: string;
  }) {
    let token = await this.redis.get('mansa_token');

    if (!token) {
      token = await this.authenticate();
    }

    try {
      return await this.sendInitiateRequest(data, token);
    } catch (err) {
      // 🔄 Handle expired token → re-auth once
      if (
        err instanceof AxiosError &&
        err.response?.status === 401 &&
        err.response?.data?.errorCode === 'INVALID_AUTH_TOKEN'
      ) {
        console.warn('🔄 MANSA token expired — re-authenticating');

        await this.redis.del('mansa_token');
        token = await this.authenticate();

        return await this.sendInitiateRequest(data, token);
      }

      throw err;
    }
  }

  /* -------------------------------------------
     🔁 ACTUAL HTTP CALL (ISOLATED)
     ------------------------------------------- */
  private async sendInitiateRequest(
  data: {
    phoneNumber: string;
    amount: number;
    fullName: string;
    emailAddress: string;
    provider: 'MOMO' | 'OM';
    
  },
  token: string,
) {
  try {
    const response = await axios.post(
      `${this.baseUrl}/api/v1/xyz/initiate`,
      {
        // ✅ EXACT FIELDS ACCEPTED BY MANSA
        paymentMode: data.provider,
        phoneNumber: data.phoneNumber,
        transactionType: 'payin',
        amount: data.amount,
        fullName: data.fullName,
        emailAddress: data.emailAddress,
  
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'client-key': this.clientKey,
          'client-secret': this.clientSecret,
        },
      },
    );

    return response.data;
  } catch (err: any) {
    console.error('❌ MANSA ERROR:', err.response?.data || err.message);

    throw new HttpException(
      err.response?.data || 'Mansa payment failed',
      err.response?.status || 500,
    );
  }
}

}
