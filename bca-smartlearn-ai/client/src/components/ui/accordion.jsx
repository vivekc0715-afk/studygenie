import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }) {
  return (
    <AccordionPrimitive.Item
      className={cn('overflow-hidden rounded-xl border border-line bg-surface', className)}
      {...props}
    />
  );
}

export function AccordionTrigger({ className, children, ...props }) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'flex flex-1 items-center justify-between gap-3 p-4 text-left text-sm font-medium text-ink transition-colors hover:bg-canvas-deep [&[data-state=open]>svg]:rotate-180',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-ink-muted transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }) {
  return (
    <AccordionPrimitive.Content
      className={cn('overflow-hidden text-[13px] leading-relaxed text-ink-soft data-[state=closed]:animate-fade-in', className)}
      {...props}
    >
      <div className="px-4 pb-4 pt-0">{children}</div>
    </AccordionPrimitive.Content>
  );
}

export default Accordion;
