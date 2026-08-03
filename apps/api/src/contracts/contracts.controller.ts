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
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/enums';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('profitability')
  profitability(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.contractsService.profitability({ from, to });
  }

  @Get('profitability/trend')
  profitabilityTrend(@Query('months') months?: string) {
    const parsed = months ? Number(months) : 6;
    return this.contractsService.profitabilityTrend(
      Number.isFinite(parsed) ? parsed : 6,
    );
  }

  @Get('fines')
  pendingFines() {
    return this.contractsService.pendingFines();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createContractSchema))
    body: CreateContractDto,
  ) {
    return this.contractsService.create(body);
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(listContractsQuerySchema))
    query: ListContractsQuery,
  ) {
    return this.contractsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateContractSchema))
    body: UpdateContractDto,
  ) {
    return this.contractsService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractsService.remove(id);
  }
}
