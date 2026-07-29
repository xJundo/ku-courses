import { useEffect, useState } from 'react';

/**
 * Just enough routing for the handful of pages this app has, without pulling
 * in a router: the server already falls back to index.html for every path.
 */
export function navigate(path: string, { replace = false } = {}) {
  if (path === window.location.pathname + window.location.search) return;
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return pathname;
}

export const routes = {
  planner: '/',
  profiles: '/profils',
  profile: (handle: string) => `/profils/${encodeURIComponent(handle)}`
};

/**
 * Splits the current path into the page to render and its parameter.
 * `/profils/alice` → `{ page: 'profile', handle: 'alice' }`.
 */
export function matchRoute(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'profils') {
    return segments[1]
      ? ({ page: 'profile', handle: decodeURIComponent(segments[1]) } as const)
      : ({ page: 'profiles' } as const);
  }
  return { page: 'planner' } as const;
}
