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
import { LeadsService } from './leads.service';
import {
  assignLeadSchema,
  createLeadSchema,
  listLeadsQuerySchema,
  logLeadContactSchema,
  qualifyLeadSchema,
  updateLeadSchema,
  updateLeadStageSchema,
  type AssignLeadDto,
  type CreateLeadDto,
  type ListLeadsQuery,
  type LogLeadContactDto,
  type QualifyLeadDto,
  type UpdateLeadDto,
  type UpdateLeadStageDto,
} from './leads.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../generated/prisma/client';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('board')
  getBoard(
    @Query(new ZodValidationPipe(listLeadsQuerySchema)) query: ListLeadsQuery,
  ) {
    return this.leadsService.getBoard(query);
  }

  @Get('staff')
  listStaff() {
    return this.leadsService.listStaff();
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(listLeadsQuerySchema)) query: ListLeadsQuery,
  ) {
    return this.leadsService.findAll(query);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createLeadSchema)) body: CreateLeadDto,
  ) {
    return this.leadsService.create(body, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: UpdateLeadDto,
  ) {
    return this.leadsService.update(id, body);
  }

  @Patch(':id/stage')
  updateStage(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLeadStageSchema))
    body: UpdateLeadStageDto,
  ) {
    return this.leadsService.updateStage(id, body, user);
  }

  @Patch(':id/assign')
  assign(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(assignLeadSchema)) body: AssignLeadDto,
  ) {
    return this.leadsService.assign(id, body, user);
  }

  @Patch(':id/qualify')
  qualify(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(qualifyLeadSchema)) body: QualifyLeadDto,
  ) {
    return this.leadsService.qualify(id, body, user);
  }

  @Post(':id/contact')
  logContact(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(logLeadContactSchema)) body: LogLeadContactDto,
  ) {
    return this.leadsService.logContact(id, body, user);
  }
}
