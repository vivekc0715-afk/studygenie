import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({ className, align = 'end', sideOffset = 6, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 rounded-xl border border-line bg-surface p-4 shadow-card-hover outline-none',
          'data-[state=open]:animate-fade-up',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export default Popover;
