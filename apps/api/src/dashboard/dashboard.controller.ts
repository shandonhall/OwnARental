import { Controller, Get } from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @RequirePermissions(Permission.DASHBOARD_READ)
  getOverview(@CurrentUser() user: User) {
    return this.dashboardService.getOverview(user);
  }
}
