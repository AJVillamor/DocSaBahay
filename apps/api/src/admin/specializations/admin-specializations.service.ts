import { Injectable } from '@nestjs/common';
import type { Specialization } from '@doksabahay/shared';
import { Prisma, Specialization as SpecializationRow } from '@prisma/client';

import type { AuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { SpecializationConflictException, SpecializationInUseException, SpecializationNotFoundException } from '../admin.exceptions';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import type { CreateSpecializationDto, UpdateSpecializationDto } from './dto/admin-specializations.dto';

function toDto(row: SpecializationRow): Specialization {
  return { id: row.id, name: row.name, slug: row.slug, description: row.description };
}

/** Maps a unique-constraint violation on `name`/`slug` to a typed conflict, mirroring `AuthService.createUser`. */
function mapConstraintError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new SpecializationConflictException();
  }
  throw error;
}

/**
 * Full CRUD over the `Specialization` catalog. `remove` refuses to delete a
 * specialization still referenced by a `DoctorSpecialization`,
 * `SymptomSpecializationRule` or `MatchingKeyword` row.
 */
@Injectable()
export class AdminSpecializationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Lists every specialization, sorted by name. */
  async list(): Promise<Specialization[]> {
    const rows = await this.prisma.specialization.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toDto);
  }

  /** @throws SpecializationConflictException if `name` or `slug` is already taken. */
  async create(actor: AuthUser, dto: CreateSpecializationDto, ipAddress?: string): Promise<Specialization> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.specialization.create({
          data: { name: dto.name, slug: dto.slug, description: dto.description },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: AUDIT_ACTIONS.SPECIALIZATION_CREATED,
          entityType: AUDIT_ENTITY_TYPES.SPECIALIZATION,
          entityId: created.id,
          before: null,
          after: toDto(created),
          ipAddress,
        });
        return toDto(created);
      });
    } catch (error) {
      mapConstraintError(error);
    }
  }

  /**
   * @throws SpecializationNotFoundException if `id` does not exist.
   * @throws SpecializationConflictException if the new `name`/`slug` is already taken.
   */
  async update(
    actor: AuthUser,
    id: string,
    dto: UpdateSpecializationDto,
    ipAddress?: string,
  ): Promise<Specialization> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.specialization.findUnique({ where: { id } });
        if (!current) {
          throw new SpecializationNotFoundException();
        }
        const updated = await tx.specialization.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.slug !== undefined && { slug: dto.slug }),
            ...(dto.description !== undefined && { description: dto.description }),
          },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: AUDIT_ACTIONS.SPECIALIZATION_UPDATED,
          entityType: AUDIT_ENTITY_TYPES.SPECIALIZATION,
          entityId: id,
          before: toDto(current),
          after: toDto(updated),
          ipAddress,
        });
        return toDto(updated);
      });
    } catch (error) {
      if (error instanceof SpecializationNotFoundException) {
        throw error;
      }
      mapConstraintError(error);
    }
  }

  /**
   * @throws SpecializationNotFoundException if `id` does not exist.
   * @throws SpecializationInUseException if any doctor, symptom rule or matching keyword still
   *   references it.
   */
  async remove(actor: AuthUser, id: string, ipAddress?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.specialization.findUnique({ where: { id } });
      if (!current) {
        throw new SpecializationNotFoundException();
      }
      const [doctorCount, ruleCount, keywordCount] = await Promise.all([
        tx.doctorSpecialization.count({ where: { specializationId: id } }),
        tx.symptomSpecializationRule.count({ where: { specializationId: id } }),
        tx.matchingKeyword.count({ where: { specializationId: id } }),
      ]);
      if (doctorCount + ruleCount + keywordCount > 0) {
        throw new SpecializationInUseException();
      }
      await tx.specialization.delete({ where: { id } });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: AUDIT_ACTIONS.SPECIALIZATION_DELETED,
        entityType: AUDIT_ENTITY_TYPES.SPECIALIZATION,
        entityId: id,
        before: toDto(current),
        after: null,
        ipAddress,
      });
    });
  }
}
