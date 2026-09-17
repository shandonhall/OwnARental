import { Controller, Get, Post } from '@nestjs/common';
import { GhlService } from './ghl.service';
import { GhlSchedulerService } from './ghl.scheduler';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@Controller('ghl')
export class GhlController {
  constructor(
    private readonly ghlService: GhlService,
    private readonly scheduler: GhlSchedulerService,
  ) {}

  @Get('status')
  @RequirePermissions(Permission.AUTOMATION_READ)
  getStatus() {
    return {
      ...this.ghlService.getStatus(),
      ...this.scheduler.getMeta(),
    };
  }

  @Post('comms/run')
  @RequirePermissions(Permission.AUTOMATION_MANAGE)
  async runComms() {
    await this.scheduler.tick();
    return {
      ok: true,
      status: this.ghlService.getStatus(),
    };
  }
}
