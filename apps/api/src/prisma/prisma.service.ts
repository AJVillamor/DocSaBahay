import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Shared Prisma client. Injected wherever database access is needed. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Connects eagerly so the first request is fast. If the database is not
   * reachable yet, the API still starts; Prisma reconnects on the next query
   * and `GET /health` reports `db: "down"` in the meantime.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.warn(
        `Database not reachable at startup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Closes the connection pool on shutdown. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
