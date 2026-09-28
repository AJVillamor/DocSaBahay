import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { SlotService } from './slot.service';

/** How far ahead to look for a doctor's next free slot in list/matching views. */
const LOOKAHEAD_DAYS = 14;

/** How long a computed `nextAvailableSlot` stays cached, per doctor. */
const TTL_MS = 60_000;

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

/**
 * Computes and caches each doctor's earliest free slot within the next
 * {@link LOOKAHEAD_DAYS} days ("nextAvailableSlot"), for the doctor discovery
 * list and the symptom-matching results — both need this for potentially
 * many doctors per request, so it is shared here (same in-memory TTL cache
 * pattern as `AuthStateService`) rather than recomputed or duplicated.
 */
@Injectable()
export class NextAvailableSlotService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly slots: SlotService) {}

  /**
   * Returns a map of doctorId -> ISO `startAt` of their earliest free slot
   * in the next {@link LOOKAHEAD_DAYS} days, or `null` if they have none.
   * Cache hits are served without touching the database; misses are computed
   * concurrently and cached for {@link TTL_MS}.
   */
  async getMany(doctorIds: string[]): Promise<Map<string, string | null>> {
    const now = Date.now();
    const result = new Map<string, string | null>();
    const toFetch: string[] = [];

    for (const doctorId of doctorIds) {
      const cached = this.cache.get(doctorId);
      if (cached && cached.expiresAt > now) {
        result.set(doctorId, cached.value);
      } else {
        toFetch.push(doctorId);
      }
    }

    if (toFetch.length > 0) {
      const from = new Date();
      const to = DateTime.fromJSDate(from).plus({ days: LOOKAHEAD_DAYS }).toJSDate();
      await Promise.all(
        toFetch.map(async (doctorId) => {
          const value = await this.computeOne(doctorId, from, to);
          this.cache.set(doctorId, { value, expiresAt: now + TTL_MS });
          result.set(doctorId, value);
        }),
      );
    }

    return result;
  }

  private async computeOne(doctorId: string, from: Date, to: Date): Promise<string | null> {
    try {
      const slots = await this.slots.getFreeSlots(doctorId, from, to);
      return slots[0]?.startAt.toISOString() ?? null;
    } catch {
      // The doctor became unbookable between the caller's own APPROVED/ACTIVE
      // check and this call (e.g. suspended mid-request); treat as no slots
      // rather than failing the whole list/matching response.
      return null;
    }
  }
}
