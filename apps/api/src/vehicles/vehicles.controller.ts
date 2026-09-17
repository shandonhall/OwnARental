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
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../generated/prisma/client';
import { sanitizeContractsForViewer } from '../auth/contract-access';
import { LicencesService } from '../licences/licences.service';

function sanitizeVehicleForViewer<T extends { contracts?: unknown }>(
  vehicle: T,
  role: User['role'],
): T {
  if (!vehicle.contracts || !Array.isArray(vehicle.contracts)) return vehicle;
  return {
    ...vehicle,
    contracts: sanitizeContractsForViewer(
      vehicle.contracts as Record<string, unknown>[],
      role,
    ),
  };
}

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly licencesService: LicencesService,
  ) {}

  @Post()
  @RequirePermissions(Permission.FLEET_WRITE)
  create(
    @Body(new ZodValidationPipe(createVehicleSchema))
    body: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(body);
  }

  @Get()
  @RequirePermissions(Permission.FLEET_READ)
  async findAll(
    @Query(new ZodValidationPipe(listVehiclesQuerySchema))
    query: ListVehiclesQuery,
    @CurrentUser() user: User,
  ) {
    const vehicles = await this.vehiclesService.findAll(query);
    return vehicles.map((vehicle) =>
      sanitizeVehicleForViewer(vehicle, user.role),
    );
  }

  @Get(':id/licences')
  @RequirePermissions(Permission.LICENCES_READ)
  licencesForVehicle(@Param('id', ParseUUIDPipe) id: string) {
    return this.licencesService.findForVehicle(id);
  }

  @Get(':id')
  @RequirePermissions(Permission.FLEET_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const vehicle = await this.vehiclesService.findOne(id);
    return sanitizeVehicleForViewer(vehicle, user.role);
  }

  @Patch(':id')
  @RequirePermissions(Permission.FLEET_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema))
    body: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions(Permission.FLEET_DELETE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.remove(id);
  }
}
