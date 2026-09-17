import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LeadIngestionService } from './lead-ingestion.service';
import { ingestLeadSchema, type IngestLeadDto } from './leads.schemas';

@Controller('integrations/leads')
export class LeadIngestionController {
  constructor(private readonly ingestion: LeadIngestionService) {}

  @Public()
  @Post()
  ingest(
    @Headers('authorization') authorization: string | undefined,
    @Body(new ZodValidationPipe(ingestLeadSchema)) body: IngestLeadDto,
  ) {
    this.ingestion.assertBearerSecret(authorization);
    return this.ingestion.ingest(body);
  }
}
