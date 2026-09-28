import { Injectable, Logger } from '@nestjs/common';
import { DbStatus, HealthResponse } from '@doksabahay/shared';

import { PrismaService } from '../prisma/prisma.service';

const DB_CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Reports API liveness and whether the database answers a trivial query. */
  async check(): Promise<HealthResponse> {
    return { status: 'ok', db: (await this.isDatabaseUp()) ? DbStatus.UP : DbStatus.DOWN };
  }

  private async isDatabaseUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Database check timed out')), DB_CHECK_TIMEOUT_MS);
    });
    try {
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      return true;
    } catch (error) {
      this.logger.warn(
        `Database check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
