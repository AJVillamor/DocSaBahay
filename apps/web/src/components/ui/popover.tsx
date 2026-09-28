'use client';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from 'cn';

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />;
}

function PopoverContent({
  className,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, 'side' | 'align' | 'sideOffset'>) {
  return (
    <PopoverPortal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            'w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-popover bg-clip-padding text-popover-foreground shadow-lg outline-none transition duration-150 ease-in-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPortal>
  );
}

export { Popover, PopoverTrigger, PopoverPortal, PopoverContent };
