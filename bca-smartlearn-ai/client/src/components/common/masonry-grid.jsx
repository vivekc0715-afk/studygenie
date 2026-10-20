import Masonry from 'react-masonry-css';
import { cn } from '../../lib/utils';

/**
 * Pinterest-style masonry grid. Breakpoints are tuned so cards reflow
 * naturally from one column on phones to four on wide desktops.
 */
const DEFAULT_BREAKPOINTS = { default: 4, 1536: 4, 1280: 3, 1024: 3, 768: 2, 640: 2, 0: 1 };

export function MasonryGrid({ children, className, breakpoints = DEFAULT_BREAKPOINTS, columnClassName }) {
  return (
    <Masonry
      breakpointCols={breakpoints}
      className={cn('masonry-grid', className)}
      columnClassName={cn('masonry-grid_column', columnClassName)}
    >
      {children}
    </Masonry>
  );
}

/** Lighter 3-column variant for dense card grids inside panels. */
export function CompactMasonry({ children, className }) {
  return (
    <MasonryGrid breakpoints={{ default: 3, 1280: 3, 1024: 2, 768: 2, 0: 1 }} className={className}>
      {children}
    </MasonryGrid>
  );
}

export default MasonryGrid;
