import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinesService } from './fines.service';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class FinesSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinesSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private bootTimer: ReturnType<typeof setTimeout> | null = null;
  readonly autoSyncEnabled: boolean;
  readonly intervalMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly fines: FinesService,
  ) {
    this.autoSyncEnabled =
      (this.config.get<string>('FINES_AUTO_SYNC') ?? 'true') !== 'false';
    const configured = Number(
      this.config.get<string>('FINES_SYNC_INTERVAL_MS'),
    );
    this.intervalMs =
      Number.isFinite(configured) && configured >= 60_000
        ? configured
        : DEFAULT_INTERVAL_MS;
  }

  onModuleInit() {
    if (!this.autoSyncEnabled) {
      this.logger.log('Fines auto-sync disabled (FINES_AUTO_SYNC=false)');
      return;
    }
    this.logger.log(`Fines auto-sync every ${this.intervalMs}ms`);
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    this.bootTimer = setTimeout(() => {
      void this.tick();
    }, 25_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.bootTimer) clearTimeout(this.bootTimer);
  }

  getMeta() {
    return {
      autoSyncEnabled: this.autoSyncEnabled,
      intervalMs: this.intervalMs,
    };
  }

  async tick() {
    try {
      const result = await this.fines.sync({});
      this.logger.debug(
        `Fines sync · scanned=${result.scanned} imported=${result.imported}`,
      );
    } catch (error) {
      this.logger.warn(
        `Fines sync tick failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
