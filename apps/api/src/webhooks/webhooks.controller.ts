import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { LeadsService } from '../leads/leads.service';

/**
 * Inbound webhooks (no staff JWT). Protect with shared secret header:
 *   x-oar-webhook-secret: <GHL_LEADS_WEBHOOK_SECRET>
 *
 * Point a GHL workflow / webhook (Meta Lead Form → GHL → this URL) at:
 *   POST {API_BASE}/api/webhooks/ghl/leads
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @Post('ghl/leads')
  ingestGhlLead(
    @Headers('x-oar-webhook-secret') secret: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const expected = process.env.GHL_LEADS_WEBHOOK_SECRET?.trim();
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    return this.leadsService.ingestExternalLead(body);
  }
}
