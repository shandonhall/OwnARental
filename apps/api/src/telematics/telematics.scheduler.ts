import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { TelematicsService } from './telematics.service';
import { TELEMATICS_SYNC_QUEUE } from './cartrack.types';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

type FleetSyncJob = {
  triggeredBy?: 'schedule' | 'queue' | 'manual';
};

@Injectable()
export class TelematicsSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TelematicsSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private bootTimer: ReturnType<typeof setTimeout> | null = null;
  private queue: Queue<FleetSyncJob> | null = null;
  private worker: Worker<FleetSyncJob> | null = null;
  readonly autoSyncEnabled: boolean;
  readonly intervalMs: number;
  queueEnabled = false;

  constructor(
    private readonly telematics: TelematicsService,
    private readonly config: ConfigService,
  ) {
    this.autoSyncEnabled =
      (this.config.get<string>('TELEMATICS_AUTO_SYNC') ?? 'true') !== 'false';
    const configured = Number(
      this.config.get<string>('TELEMATICS_SYNC_INTERVAL_MS'),
    );
    this.intervalMs =
      Number.isFinite(configured) && configured >= 30_000
        ? configured
        : DEFAULT_INTERVAL_MS;
  }

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    if (redisUrl) {
      try {
        this.queue = new Queue<FleetSyncJob>(TELEMATICS_SYNC_QUEUE, {
          connection: { url: redisUrl },
        });
        this.worker = new Worker<FleetSyncJob>(
          TELEMATICS_SYNC_QUEUE,
          async (job) => {
            const triggeredBy = job.data.triggeredBy ?? 'queue';
            return this.telematics.syncFleet(
              triggeredBy === 'manual' ? 'queue' : triggeredBy,
            );
          },
          { connection: { url: redisUrl } },
        );
        this.worker.on('failed', (job, error) => {
          this.logger.warn(
            `Telematics job ${job?.id ?? '?'} failed: ${error.message}`,
          );
        });
        this.queueEnabled = true;
        this.logger.log('Telematics BullMQ worker connected via REDIS_URL');
      } catch (error) {
        this.logger.warn(
          `Redis/BullMQ unavailable — falling back to inline sync: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
        this.queue = null;
        this.worker = null;
        this.queueEnabled = false;
      }
    }

    if (!this.autoSyncEnabled) {
      this.logger.log(
        'Telematics auto-sync disabled (TELEMATICS_AUTO_SYNC=false)',
      );
      return;
    }

    this.logger.log(
      `Telematics auto-sync every ${this.intervalMs}ms (${this.queueEnabled ? 'BullMQ' : 'inline'})`,
    );
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);

    this.bootTimer = setTimeout(() => {
      void this.tick();
    }, 15_000);
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    await this.worker?.close();
    await this.queue?.close();
  }

  getMeta() {
    return {
      autoSyncEnabled: this.autoSyncEnabled,
      intervalMs: this.intervalMs,
      queueEnabled: this.queueEnabled,
    };
  }

  private async tick() {
    try {
      if (this.queue) {
        await this.queue.add(
          'fleet-sync',
          { triggeredBy: 'schedule' },
          {
            removeOnComplete: 20,
            removeOnFail: 50,
            jobId: `fleet-sync-${Math.floor(Date.now() / this.intervalMs)}`,
          },
        );
        this.logger.debug('Enqueued telematics fleet sync job');
        return;
      }

      await this.telematics.syncFleet('schedule');
    } catch (error) {
      this.logger.warn(
        `Scheduled telematics sync failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
