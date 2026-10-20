import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&_svg]:shrink-0 [&_svg]:size-4 active:scale-[0.985] select-none',
  {
    variants: {
      variant: {
        default: 'bg-brand text-white shadow-sm hover:bg-brand-strong',
        outline: 'border border-line-strong bg-surface text-ink hover:bg-canvas-deep hover:border-ink-faint',
        secondary: 'bg-canvas-deep text-ink hover:bg-line',
        ghost: 'text-ink-soft hover:bg-canvas-deep hover:text-ink',
        subtle: 'bg-brand-soft text-brand hover:bg-lavender',
        soft: 'bg-surface text-ink border border-line shadow-card hover:shadow-card-hover',
        danger: 'bg-danger text-white hover:brightness-95',
        dangerSoft: 'bg-danger-soft text-danger hover:brightness-97',
        success: 'bg-success text-white hover:brightness-95',
        link: 'text-brand underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        default: 'h-10 px-4',
        lg: 'h-11 px-6 text-[15px]',
        icon: 'size-10 p-0',
        iconSm: 'size-8 p-0',
        pill: 'h-9 rounded-full px-4 text-[13px]',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'default', size: 'default', block: false },
  }
);

export function Button({ className, variant, size, block, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}

export { buttonVariants };
export default Button;
