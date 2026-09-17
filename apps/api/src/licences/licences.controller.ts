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
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LicencesService } from './licences.service';
import {
  createLicenceSchema,
  listLicencesQuerySchema,
  updateLicenceSchema,
  type CreateLicenceDto,
  type ListLicencesQuery,
  type UpdateLicenceDto,
} from './licences.schemas';

@Controller('licences')
export class LicencesController {
  constructor(private readonly licencesService: LicencesService) {}

  @Get()
  @RequirePermissions(Permission.LICENCES_READ)
  findAll(
    @Query(new ZodValidationPipe(listLicencesQuerySchema))
    query: ListLicencesQuery,
  ) {
    return this.licencesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.LICENCES_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.licencesService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.LICENCES_WRITE)
  create(
    @Body(new ZodValidationPipe(createLicenceSchema)) body: CreateLicenceDto,
  ) {
    return this.licencesService.create(body);
  }

  @Patch(':id')
  @RequirePermissions(Permission.LICENCES_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLicenceSchema)) body: UpdateLicenceDto,
  ) {
    return this.licencesService.update(id, body);
  }
}
