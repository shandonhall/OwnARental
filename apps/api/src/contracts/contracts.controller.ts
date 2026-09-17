import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import {
  createContractSchema,
  updateContractSchema,
  listContractsQuerySchema,
} from './contracts.schemas';
import type {
  CreateContractDto,
  UpdateContractDto,
  ListContractsQuery,
} from './contracts.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../generated/prisma/client';
import {
  sanitizeContractForViewer,
  sanitizeContractsForViewer,
} from '../auth/contract-access';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('profitability')
  @RequirePermissions(Permission.FINANCE_READ)
  profitability(@Query('from') from?: string, @Query('to') to?: string) {
    return this.contractsService.profitability({ from, to });
  }

  @Get('profitability/trend')
  @RequirePermissions(Permission.FINANCE_READ)
  profitabilityTrend(@Query('months') months?: string) {
    const parsed = months ? Number(months) : 6;
    return this.contractsService.profitabilityTrend(
      Number.isFinite(parsed) ? parsed : 6,
    );
  }

  @Get('fines')
  @RequirePermissions(Permission.FINES_READ)
  pendingFines() {
    return this.contractsService.pendingFines();
  }

  @Post()
  @RequirePermissions(Permission.CONTRACTS_WRITE)
  create(
    @Body(new ZodValidationPipe(createContractSchema))
    body: CreateContractDto,
    @CurrentUser() user: User,
  ) {
    return this.contractsService
      .create(body)
      .then((contract) =>
        sanitizeContractForViewer(
          contract as unknown as Record<string, unknown>,
          user.role,
        ),
      );
  }

  @Get()
  @RequirePermissions(Permission.CONTRACTS_READ)
  async findAll(
    @Query(new ZodValidationPipe(listContractsQuerySchema))
    query: ListContractsQuery,
    @CurrentUser() user: User,
  ) {
    const contracts = await this.contractsService.findAll(query);
    return sanitizeContractsForViewer(
      contracts as unknown as Record<string, unknown>[],
      user.role,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.CONTRACTS_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const contract = await this.contractsService.findOne(id);
    return sanitizeContractForViewer(
      contract as unknown as Record<string, unknown>,
      user.role,
    );
  }

  @Patch(':id')
  @RequirePermissions(Permission.CONTRACTS_WRITE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateContractSchema))
    body: UpdateContractDto,
    @CurrentUser() user: User,
  ) {
    const contract = await this.contractsService.update(id, body);
    return sanitizeContractForViewer(
      contract as unknown as Record<string, unknown>,
      user.role,
    );
  }

  @Delete(':id')
  @RequirePermissions(Permission.CONTRACTS_DELETE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractsService.remove(id);
  }
}
