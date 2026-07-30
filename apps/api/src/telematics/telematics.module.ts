import { Module } from '@nestjs/common';
import { TelematicsService } from './telematics.service';
import { TelematicsController } from './telematics.controller';
import { TelematicsSchedulerService } from './telematics.scheduler';
import { GhlModule } from '../ghl/ghl.module';

@Module({
  imports: [GhlModule],
  controllers: [TelematicsController],
  providers: [TelematicsService, TelematicsSchedulerService],
  exports: [TelematicsService, TelematicsSchedulerService],
})
export class TelematicsModule {}
