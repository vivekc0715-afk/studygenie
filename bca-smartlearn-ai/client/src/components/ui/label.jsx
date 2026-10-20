import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../lib/utils';

export function Label({ className, required, children, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn('text-[13px] font-medium leading-none text-ink-soft', className)}
      {...props}
    >
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </LabelPrimitive.Root>
  );
}

export default Label;
