import { useEffect } from 'react';

/** Sets `document.title` for the active route. */
export function useDocumentTitle(title, { suffix = 'BCA SmartLearn AI' } = {}) {
  useEffect(() => {
    document.title = title ? `${title} · ${suffix}` : suffix;
  }, [title, suffix]);
}

export default useDocumentTitle;
