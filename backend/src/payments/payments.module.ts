import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { MansaModule } from '../mansa/mansa.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    MansaModule, // ✅ REQUIRED for MoMo integration
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
