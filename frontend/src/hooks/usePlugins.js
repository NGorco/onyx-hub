import { useState, useEffect } from 'react';

let cache = null;

export function usePlugins() {
  const [plugins, setPlugins] = useState(cache?.plugins || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;

    fetch('/api/plugins')
      .then(r => r.json())
      .then(data => {
        cache = data;
        setPlugins(data.plugins || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load plugins:', err);
        setLoading(false);
      });
  }, []);

  return { plugins, loading };
}
