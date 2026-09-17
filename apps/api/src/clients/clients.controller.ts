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
import { ClientsService } from './clients.service';
import { createClientSchema, updateClientSchema } from './clients.schemas';
import type { CreateClientDto, UpdateClientDto } from './clients.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '../generated/prisma/client';
import {
  sanitizeClientForViewer,
  sanitizeClientsForViewer,
} from '../auth/contract-access';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermissions(Permission.CLIENTS_WRITE)
  create(
    @Body(new ZodValidationPipe(createClientSchema))
    body: CreateClientDto,
  ) {
    return this.clientsService.create(body);
  }

  @Get()
  @RequirePermissions(Permission.CLIENTS_READ)
  async findAll(
    @Query('search') search: string | undefined,
    @CurrentUser() user: User,
  ) {
    const clients = await this.clientsService.findAll(search);
    return sanitizeClientsForViewer(
      clients as unknown as Record<string, unknown>[],
      user.role,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.CLIENTS_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const client = await this.clientsService.findOne(id);
    return sanitizeClientForViewer(
      client as unknown as Record<string, unknown>,
      user.role,
    );
  }

  @Patch(':id')
  @RequirePermissions(Permission.CLIENTS_WRITE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateClientSchema))
    body: UpdateClientDto,
    @CurrentUser() user: User,
  ) {
    const client = await this.clientsService.update(id, body);
    return sanitizeClientForViewer(
      client as unknown as Record<string, unknown>,
      user.role,
    );
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLIENTS_DELETE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.remove(id);
  }

  @Post(':id/sync-ghl')
  @RequirePermissions(Permission.CLIENTS_WRITE)
  async syncGhl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const client = await this.clientsService.syncToGhl(id);
    return sanitizeClientForViewer(
      client as unknown as Record<string, unknown>,
      user.role,
    );
  }
}
