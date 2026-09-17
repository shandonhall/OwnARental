import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
} from '@nestjs/common';
import { TelematicsService } from './telematics.service';
import { TelematicsSchedulerService } from './telematics.scheduler';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../generated/prisma/client';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

const immobilizeSchema = z.object({
  immobilize: z.boolean(),
  confirm: z.literal(true),
});

@Controller('telematics')
export class TelematicsController {
  constructor(
    private readonly telematicsService: TelematicsService,
    private readonly scheduler: TelematicsSchedulerService,
  ) {}

  @Get('status')
  @RequirePermissions(Permission.TELEMATICS_READ)
  getStatus() {
    return this.telematicsService.getStatus(this.scheduler.getMeta());
  }

  @Get('map')
  @RequirePermissions(Permission.TELEMATICS_READ)
  getMap() {
    return this.telematicsService.getMapAssets();
  }

  @Post('sync')
  @RequirePermissions(Permission.TELEMATICS_SYNC)
  syncFleet() {
    return this.telematicsService.syncFleet('manual');
  }

  @Post('vehicles/:id/sync')
  @RequirePermissions(Permission.TELEMATICS_SYNC)
  syncVehicle(@Param('id', ParseUUIDPipe) id: string) {
    return this.telematicsService.syncVehicle(id);
  }

  @Get('vehicles/:id')
  @RequirePermissions(Permission.TELEMATICS_READ)
  getVehicle(@Param('id', ParseUUIDPipe) id: string) {
    return this.telematicsService.getVehicleTelematics(id);
  }

  @Post('vehicles/:id/immobilize')
  @RequirePermissions(Permission.TELEMATICS_IMMOBILIZE)
  immobilize(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(immobilizeSchema))
    body: z.infer<typeof immobilizeSchema>,
    @CurrentUser() user: User,
  ) {
    return this.telematicsService.setImmobilized(id, body.immobilize, user);
  }
}
