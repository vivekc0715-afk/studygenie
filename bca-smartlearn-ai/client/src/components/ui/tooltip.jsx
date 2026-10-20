import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 6, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-[16rem] rounded-lg bg-ink px-2.5 py-1.5 text-[12px] leading-snug text-canvas shadow-card',
          'data-[state=delayed-open]:animate-fade-in',
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export default Tooltip;
