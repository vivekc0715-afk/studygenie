import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps list state (page, limit, search, sort and arbitrary filters) in the URL
 * so refresh / back-button / sharing all behave predictably.
 */
export function useListParams({ defaults = {} } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => {
    const base = {
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || defaults.limit || 24,
      search: searchParams.get('search') || '',
      sortBy: searchParams.get('sortBy') || defaults.sortBy || '',
      sortOrder: searchParams.get('sortOrder') || defaults.sortOrder || 'desc',
      ...Object.fromEntries(
        Object.keys(defaults)
          .filter((key) => !['limit', 'sortBy', 'sortOrder'].includes(key))
          .map((key) => [key, searchParams.get(key) || defaults[key] || ''])
      ),
    };
    // Include any other filter already present in the URL.
    searchParams.forEach((value, key) => {
      if (!(key in base)) base[key] = value;
    });
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /** Merge patch values; resets to page 1 unless `page` is included. */
  const setParams = useCallback(
    (patch, { replace = false, resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);
      const merged = resetPage && !('page' in patch) ? { page: 1, ...patch } : patch;

      Object.entries(merged).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') next.delete(key);
        else next.set(key, String(value));
      });
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  const reset = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);

  /** Strips paging keys — handy for query-string building. */
  const query = useMemo(() => {
    const { page, limit, ...rest } = params;
    return { page, limit, ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== '')) };
  }, [params]);

  return { params, query, setParams, reset };
}

export default useListParams;
