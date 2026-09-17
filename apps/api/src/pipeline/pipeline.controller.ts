import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { updateEndOfTermStageSchema } from './pipeline.schemas';
import type { UpdateEndOfTermStageDto } from './pipeline.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('end-of-term')
  @RequirePermissions(Permission.END_OF_TERM_READ)
  getBoard() {
    return this.pipelineService.getEndOfTermBoard();
  }

  @Patch('end-of-term/:id')
  @RequirePermissions(Permission.END_OF_TERM_WRITE)
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateEndOfTermStageSchema))
    body: UpdateEndOfTermStageDto,
  ) {
    return this.pipelineService.updateStage(id, body);
  }
}
