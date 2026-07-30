import { Controller, Get, Post } from '@nestjs/common';
import { GhlService } from './ghl.service';
import { GhlSchedulerService } from './ghl.scheduler';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/enums';

@Controller('ghl')
export class GhlController {
  constructor(
    private readonly ghlService: GhlService,
    private readonly scheduler: GhlSchedulerService,
  ) {}

  @Get('status')
  getStatus() {
    return {
      ...this.ghlService.getStatus(),
      ...this.scheduler.getMeta(),
    };
  }

  @Post('comms/run')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async runComms() {
    await this.scheduler.tick();
    return {
      ok: true,
      status: this.ghlService.getStatus(),
    };
  }
}
