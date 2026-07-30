import { Module } from '@nestjs/common';
import { FinesController } from './fines.controller';
import { FinesService } from './fines.service';
import { FinesSchedulerService } from './fines.scheduler';
import { GhlModule } from '../ghl/ghl.module';

@Module({
  imports: [GhlModule],
  controllers: [FinesController],
  providers: [FinesService, FinesSchedulerService],
  exports: [FinesService, FinesSchedulerService],
})
export class FinesModule {}
