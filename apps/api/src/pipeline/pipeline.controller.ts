import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import {
  updateEndOfTermStageSchema,
  type UpdateEndOfTermStageDto,
} from './pipeline.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/enums';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('end-of-term')
  getBoard() {
    return this.pipelineService.getEndOfTermBoard();
  }

  @Patch('end-of-term/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.FLEET_MANAGER)
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateEndOfTermStageSchema))
    body: UpdateEndOfTermStageDto,
  ) {
    return this.pipelineService.updateStage(id, body);
  }
}
