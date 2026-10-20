import { cn } from '../../lib/utils';

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton-sheen rounded-xl', className)} {...props} />;
}

/** A grid of masonry-ish skeletons used while lists load. */
export function SkeletonCards({ count = 6, heights = [180, 240, 200, 260, 170, 220], className }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} style={{ height: heights[index % heights.length] }} />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5, className }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

export default Skeleton;
