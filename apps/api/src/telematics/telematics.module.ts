import { Module } from '@nestjs/common';
import { TelematicsService } from './telematics.service';
import { TelematicsController } from './telematics.controller';

@Module({
  controllers: [TelematicsController],
  providers: [TelematicsService],
  exports: [TelematicsService],
})
export class TelematicsModule {}
