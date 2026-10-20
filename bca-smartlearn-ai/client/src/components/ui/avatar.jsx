import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, initialsOf } from '../../lib/utils';

export function Avatar({ className, ...props }) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex size-9 shrink-0 overflow-hidden rounded-full border border-line', className)}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }) {
  return <AvatarPrimitive.Image className={cn('aspect-square size-full object-cover', className)} {...props} />;
}

export function AvatarFallback({ className, name = 'Student', ...props }) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex size-full items-center justify-center bg-lavender-soft text-[12px] font-semibold text-lavender-ink',
        className
      )}
      {...props}
    >
      {initialsOf(name)}
    </AvatarPrimitive.Fallback>
  );
}

export default Avatar;
