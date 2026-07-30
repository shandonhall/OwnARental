import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { FinesService } from './fines.service';
import { FinesSchedulerService } from './fines.scheduler';
import {
  listFinesQuerySchema,
  type ListFinesQuery,
} from './fines.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/enums';

@Controller('fines')
export class FinesController {
  constructor(
    private readonly finesService: FinesService,
    private readonly scheduler: FinesSchedulerService,
  ) {}

  @Get('status')
  getStatus() {
    return this.finesService.getStatus(this.scheduler.getMeta());
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(listFinesQuerySchema)) query: ListFinesQuery,
  ) {
    return this.finesService.list(query);
  }

  @Post('sync')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.FLEET_MANAGER)
  sync(@Query('registration') registration?: string) {
    return this.finesService.sync({
      registration: registration?.trim() || undefined,
    });
  }

  @Post(':id/invoice')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.FLEET_MANAGER)
  invoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.finesService.invoice(id);
  }
}
