import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetPortal = SheetPrimitive.Portal;

const SIDES = {
  left: 'inset-y-0 left-0 h-full w-[19rem] border-r data-[state=open]:slide-in-from-left',
  right: 'inset-y-0 right-0 h-full w-[19rem] border-l data-[state=open]:slide-in-from-right',
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t',
};

export function SheetContent({ className, children, side = 'left', hideClose = false, ...props }) {
  return (
    <SheetPortal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[3px] data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-2 overflow-y-auto bg-surface p-4 shadow-card-hover transition-transform',
          side !== 'bottom' && 'border-line',
          SIDES[side],
          className
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <SheetPrimitive.Close
            className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-canvas-deep hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

export function SheetTitle({ className, ...props }) {
  return <SheetPrimitive.Title className={cn('text-base font-semibold text-ink', className)} {...props} />;
}

export function SheetDescription({ className, ...props }) {
  return <SheetPrimitive.Description className={cn('text-[13px] text-ink-muted', className)} {...props} />;
}

export default Sheet;
