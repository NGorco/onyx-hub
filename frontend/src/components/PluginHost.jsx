import { useState, useEffect } from 'react';
import { createSdk } from '../sdk';

export default function PluginHost({ plugin }) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let objectUrl;

    const load = async () => {
      try {
        const entry = plugin.ui?.entry || 'index.js';
        const res = await fetch(`/api/plugins/${plugin.id}/ui/${entry}`);

        if (!res.ok) {
          throw new Error(`Failed to load plugin UI: ${res.status}`);
        }

        const code = await res.text();
        const blob = new Blob([code], { type: 'application/javascript' });
        objectUrl = URL.createObjectURL(blob);
        const mod = await import(/* @vite-ignore */ objectUrl);
        setComponent(() => mod.default);
      } catch (err) {
        console.error(`Plugin ${plugin.id} load error:`, err);
        setError(err.message);
      }
    };

    load();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [plugin.id]);

  const sdk = createSdk(plugin.id);

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Plugin Error</h2>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
          Loading {plugin.name}...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Component sdk={sdk} />
    </div>
  );
}
