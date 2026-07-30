import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  listNotificationsQuerySchema,
  type ListNotificationsQuery,
} from './notifications.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../generated/prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema))
    query: ListNotificationsQuery,
  ) {
    return this.notificationsService.listForUser(user, query);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markRead(user, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user);
  }
}
