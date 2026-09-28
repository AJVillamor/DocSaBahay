'use client';

import { slotListSchema, type Slot } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

/** A doctor's free consultation slots between `from` and `to` (both ISO instants). */
export function useDoctorSlots(doctorId: string | undefined, from: string, to: string) {
  return useQuery<Slot[], ApiError>({
    queryKey: ['doctors', doctorId, 'slots', from, to],
    queryFn: ({ signal }) =>
      api.get(
        `/doctors/${doctorId}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        slotListSchema,
        signal,
      ),
    enabled: Boolean(doctorId),
  });
}
