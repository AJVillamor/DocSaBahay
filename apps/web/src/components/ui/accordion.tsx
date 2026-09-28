'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from 'cn';

export interface AccordionItemData {
  question: string;
  answer: string;
}

/**
 * Minimal single-open accordion (no Radix/base-ui primitive for this exists in the repo yet).
 * Each trigger is a plain `<button>`, so it is keyboard-operable for free.
 */
export function Accordion({
  items,
  className,
}: {
  items: AccordionItemData[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={cn('flex flex-col divide-y divide-border rounded-xl border', className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const triggerId = `accordion-trigger-${index}`;
        const panelId = `accordion-panel-${index}`;

        return (
          <div key={item.question}>
            <h3 className="text-base font-medium">
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="px-4 pb-4 text-sm text-muted-foreground"
            >
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
