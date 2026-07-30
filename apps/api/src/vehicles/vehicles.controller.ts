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
import { VehiclesService } from './vehicles.service';
import {
  createVehicleSchema,
  updateVehicleSchema,
  listVehiclesQuerySchema,
} from './vehicles.schemas';
import type {
  CreateVehicleDto,
  UpdateVehicleDto,
  ListVehiclesQuery,
} from './vehicles.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/enums';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createVehicleSchema))
    body: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(body);
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(listVehiclesQuerySchema))
    query: ListVehiclesQuery,
  ) {
    return this.vehiclesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema))
    body: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.remove(id);
  }
}
