import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LeadsService } from './leads.service';
import {
  assignLeadSchema,
  convertClientSchema,
  createLeadSchema,
  creativeReportQuerySchema,
  listLeadsQuerySchema,
  updateLeadSchema,
  type AssignLeadDto,
  type ConvertClientDto,
  type CreateLeadDto,
  type CreativeReportQuery,
  type ListLeadsQuery,
  type UpdateLeadDto,
} from './leads.schemas';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('reports/creative')
  @RequirePermissions(Permission.LEADS_REPORTS)
  creativeReport(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(creativeReportQuerySchema))
    query: CreativeReportQuery,
  ) {
    return this.leadsService.creativeReport(user, query);
  }

  @Get()
  @RequirePermissions(Permission.LEADS_READ)
  findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listLeadsQuerySchema)) query: ListLeadsQuery,
  ) {
    return this.leadsService.findAll(user, query);
  }

  @Post()
  @RequirePermissions(Permission.LEADS_WRITE)
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createLeadSchema)) body: CreateLeadDto,
  ) {
    return this.leadsService.create(user, body);
  }

  @Get(':id')
  @RequirePermissions(Permission.LEADS_READ)
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.LEADS_WRITE)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: UpdateLeadDto,
  ) {
    return this.leadsService.update(user, id, body);
  }

  @Post(':id/assign')
  @RequirePermissions(Permission.LEADS_ASSIGN)
  assign(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(assignLeadSchema)) body: AssignLeadDto,
  ) {
    return this.leadsService.assign(user, id, body);
  }

  @Get(':id/assignments')
  @RequirePermissions(Permission.LEADS_READ)
  listAssignments(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.listAssignments(user, id);
  }

  @Get(':id/stages')
  @RequirePermissions(Permission.LEADS_READ)
  listStages(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.listStages(user, id);
  }

  @Post(':id/convert-client')
  @RequirePermissions(Permission.LEADS_WRITE)
  convertClient(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(convertClientSchema)) body: ConvertClientDto,
  ) {
    return this.leadsService.convertClient(user, id, body);
  }
}
