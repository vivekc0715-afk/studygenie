import { cn } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

/**
 * Optional right-hand panel. Pages drop this next to their main column and it
 * simply disappears below the 2xl breakpoint, keeping mobile layouts clean.
 */
export function SidePanel({ title, description, children, className, actions }) {
  return (
    <aside className={cn('w-full 2xl:w-[20rem] 2xl:shrink-0', className)}>
      <div className="space-y-4 2xl:sticky 2xl:top-[4.6rem]">
        {title ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle>{title}</CardTitle>
              {actions}
            </CardHeader>
            <CardContent className="space-y-3">
              {description ? <p className="text-[12.5px] leading-relaxed text-ink-muted">{description}</p> : null}
              {children}
            </CardContent>
          </Card>
        ) : (
          children
        )}
      </div>
    </aside>
  );
}

export default SidePanel;
