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
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/enums';
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
  getStatus() {
    return this.telematicsService.getStatus(this.scheduler.getMeta());
  }

  @Get('map')
  getMap() {
    return this.telematicsService.getMapAssets();
  }

  @Post('sync')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.FLEET_MANAGER)
  syncFleet() {
    return this.telematicsService.syncFleet('manual');
  }

  @Post('vehicles/:id/sync')
  syncVehicle(@Param('id', ParseUUIDPipe) id: string) {
    return this.telematicsService.syncVehicle(id);
  }

  @Get('vehicles/:id')
  getVehicle(@Param('id', ParseUUIDPipe) id: string) {
    return this.telematicsService.getVehicleTelematics(id);
  }

  @Post('vehicles/:id/immobilize')
  @Roles(Role.SUPER_ADMIN)
  immobilize(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(immobilizeSchema))
    body: z.infer<typeof immobilizeSchema>,
    @CurrentUser() user: User,
  ) {
    return this.telematicsService.setImmobilized(id, body.immobilize, user);
  }
}
