import { Module } from '@nestjs/common';
import { MansaService } from './mansa.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule], // ✅ REQUIRED
  providers: [MansaService],
  exports: [MansaService],
})
export class MansaModule {}
