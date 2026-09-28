'use client';

import type { Prescription } from '@doksabahay/shared';
import { DateTime } from 'luxon';

import { Button } from '@/components/ui/button';

/**
 * Full-screen printable view of one ISSUED prescription. No PDF generation
 * (hard "no external services" rule) — printing uses the browser's own print
 * dialog against the `.printable-prescription` scope in `globals.css`, which
 * hides everything else on the page.
 */
export function PrintablePrescription({
  prescription,
  onClose,
}: {
  prescription: Prescription;
  onClose: () => void;
}) {
  return (
    <div className="printable-prescription fixed inset-0 z-50 overflow-y-auto bg-background p-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div className="flex items-center justify-between print:hidden">
          <h2 className="text-lg font-semibold">Prescription</h2>
          <div className="flex gap-2">
            <Button type="button" onClick={() => window.print()}>
              Print
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-b pb-3">
          <p className="text-sm text-muted-foreground">
            Issued{' '}
            {prescription.issuedAt
              ? DateTime.fromISO(prescription.issuedAt).toLocaleString(DateTime.DATE_MED)
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            Fictional prototype — not for real medical use.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {prescription.items.map((item) => (
            <li key={item.id} className="rounded-lg border p-3 text-sm break-words">
              <p className="font-medium">{item.medicationName}</p>
              <p className="text-muted-foreground">
                {item.dosage} — {item.frequency} — {item.duration}
              </p>
              {item.instructions ? <p className="mt-1">{item.instructions}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
