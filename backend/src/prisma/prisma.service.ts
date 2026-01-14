import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit {

  async onModuleInit() {
    await this.$connect();

    const info = await this.$queryRawUnsafe(
      `SELECT current_database(), current_schema()`
    );

    console.log('🧠 PRISMA CONNECTED TO:', info);
  }
}
