import { useEffect, useRef, useState } from "react";

/**
 * Ensures a loading state stays visible for at least `minMs` milliseconds.
 *
 * Usage:
 *   const showLoading = useMinLoading(loading, 1200);
 *   if (showLoading) return <LoadingSpinner />;
 */
export default function useMinLoading(loading, minMs = 1200) {
  const [show, setShow] = useState(loading);
  const startRef = useRef(null);

  useEffect(() => {
    if (loading) {
      startRef.current = Date.now();
      setShow(true);
    } else {
      const elapsed = startRef.current != null ? Date.now() - startRef.current : minMs;
      const remaining = Math.max(0, minMs - elapsed);

      const id = setTimeout(() => setShow(false), remaining);
      return () => clearTimeout(id);
    }
  }, [loading, minMs]);

  return show;
}
