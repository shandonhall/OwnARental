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
import { listFinesQuerySchema, type ListFinesQuery } from './fines.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@Controller('fines')
export class FinesController {
  constructor(
    private readonly finesService: FinesService,
    private readonly scheduler: FinesSchedulerService,
  ) {}

  @Get('status')
  @RequirePermissions(Permission.FINES_READ)
  getStatus() {
    return this.finesService.getStatus(this.scheduler.getMeta());
  }

  @Get()
  @RequirePermissions(Permission.FINES_READ)
  list(
    @Query(new ZodValidationPipe(listFinesQuerySchema)) query: ListFinesQuery,
  ) {
    return this.finesService.list(query);
  }

  @Post('sync')
  @RequirePermissions(Permission.FINES_WRITE)
  sync(@Query('registration') registration?: string) {
    return this.finesService.sync({
      registration: registration?.trim() || undefined,
    });
  }

  @Post(':id/invoice')
  @RequirePermissions(Permission.FINES_WRITE)
  invoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.finesService.invoice(id);
  }
}
