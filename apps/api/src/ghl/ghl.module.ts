import { Module } from '@nestjs/common';
import { GhlService } from './ghl.service';
import { GhlSchedulerService } from './ghl.scheduler';
import { GhlController } from './ghl.controller';

@Module({
  controllers: [GhlController],
  providers: [GhlService, GhlSchedulerService],
  exports: [GhlService, GhlSchedulerService],
})
export class GhlModule {}
