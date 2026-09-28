import { Injectable } from '@nestjs/common';
import { AUDIT_LOGS_PAGE_SIZE, type AuditLogEntry, type PaginatedAuditLogs } from '@doksabahay/shared';
import { AuditLog, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';

/** Keys stripped from `before`/`after` snapshots before they are stored, however deep they appear. */
const SENSITIVE_KEY_PATTERN = /token|password/i;

/** Recursively drops any object key matching {@link SENSITIVE_KEY_PATTERN}. */
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
        .map(([key, entryValue]) => [key, sanitize(entryValue)]),
    );
  }
  return value;
}

/** Maps a snapshot to Prisma's `Json?` input: absent/null becomes true SQL NULL (`Prisma.DbNull`). */
function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === undefined || value === null) {
    return Prisma.DbNull;
  }
  return sanitize(value) as Prisma.InputJsonValue;
}

function toAuditLogEntry(row: AuditLog): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    before: row.before,
    after: row.after,
    reason: row.reason,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Parameters accepted by {@link AuditService.record}. */
export interface RecordAuditParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
}

/**
 * Writes and reads `AuditLog` rows — the only writer of that table. Every
 * mutation the admin modules make must call {@link record} inside the same
 * Prisma transaction as the change it documents, so the two either both
 * commit or both roll back together. Reading (`query`) is append-only: there
 * is deliberately no update or delete.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserts one `AuditLog` row via `tx`. `before`/`after` are sanitized
   * (see {@link sanitize}) so a password hash or token accidentally included
   * in a snapshot is never persisted, per this project's hard rule against
   * logging credentials.
   */
  async record(tx: Prisma.TransactionClient, params: RecordAuditParams): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: toJsonInput(params.before),
        after: toJsonInput(params.after),
        reason: params.reason ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  }

  /** Lists audit entries, newest first, filtered by any of the given query params. */
  async query(query: AuditLogQueryDto): Promise<PaginatedAuditLogs> {
    const page = query.page ?? 1;
    const pageSize = AUDIT_LOGS_PAGE_SIZE;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.action && { action: query.action }),
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.entityId && { entityId: query.entityId }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };

    const [items, totalCount] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items: items.map(toAuditLogEntry), page, pageSize, totalCount };
  }

  /** Newest `limit` audit entries, unfiltered — used by the admin dashboard summary. */
  async recent(limit: number): Promise<AuditLogEntry[]> {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    return rows.map(toAuditLogEntry);
  }
}
