import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll window to top on pathname change (SPA navigation). */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
