import { useState, useEffect } from 'react';

let cache = null;

export function usePages() {
  const [pages, setPages] = useState(cache?.pages || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    fetch('/api/pages')
      .then(r => r.json())
      .then(data => {
        cache = data;
        setPages(data.pages || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { pages, loading };
}
