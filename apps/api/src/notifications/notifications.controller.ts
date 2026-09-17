import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../generated/prisma/client';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import {
  listNotificationsQuerySchema,
  type ListNotificationsQuery,
} from './notifications.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { NotificationsService } from './notifications.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  list(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema))
    query: ListNotificationsQuery,
  ) {
    return this.notificationsService.listForUser(user, query);
  }

  @Patch(':id/read')
  @RequirePermissions(Permission.NOTIFICATIONS_WRITE)
  markRead(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(user, id);
  }

  @Post('read-all')
  @RequirePermissions(Permission.NOTIFICATIONS_WRITE)
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user);
  }
}
