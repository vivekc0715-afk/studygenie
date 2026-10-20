import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

export function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=unchecked]:bg-line-strong data-[state=checked]:bg-brand',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform',
          'data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export default Switch;
