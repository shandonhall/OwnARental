import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LedgerService } from './ledger.service';
import {
  createLedgerEntrySchema,
  updateLedgerEntrySchema,
} from './ledger.schemas';
import type {
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
} from './ledger.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../generated/prisma/client';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@Controller('contracts/:contractId/ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post()
  @RequirePermissions(Permission.FINANCE_WRITE)
  create(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body(new ZodValidationPipe(createLedgerEntrySchema))
    body: CreateLedgerEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.ledgerService.create(contractId, body, user);
  }

  @Patch(':entryId')
  @RequirePermissions(Permission.FINANCE_WRITE)
  update(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body(new ZodValidationPipe(updateLedgerEntrySchema))
    body: UpdateLedgerEntryDto,
  ) {
    return this.ledgerService.update(contractId, entryId, body);
  }

  @Delete(':entryId')
  @RequirePermissions(Permission.FINANCE_WRITE)
  remove(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.ledgerService.remove(contractId, entryId);
  }
}
