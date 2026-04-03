import { useState, useEffect } from 'react';
import { createSdk } from '../sdk';

export default function WidgetHost({ plugin, widget, params = {}, bare = false }) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let objectUrl;
    const load = async () => {
      try {
        const res = await fetch(`/api/plugins/${plugin.id}/widgets/${widget.entry}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const code = await res.text();
        const blob = new Blob([code], { type: 'application/javascript' });
        objectUrl = URL.createObjectURL(blob);
        const mod = await import(/* @vite-ignore */ objectUrl);
        setComponent(() => mod.default);
      } catch (err) {
        setError(err.message);
      }
    };
    load();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [plugin.id, widget.entry]);

  const sdk = createSdk(plugin.id);

  if (bare) {
    return (
      <div>
        {error
          ? <p className="text-red-500 text-sm">Failed to load: {error}</p>
          : Component
            ? <Component sdk={sdk} params={params} />
            : <p className="text-gray-400 text-sm">Loading...</p>
        }
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{widget.name}</h3>
        {!Component && !error && (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        )}
      </div>
      {error
        ? <p className="text-red-500 text-sm">Failed to load: {error}</p>
        : Component
          ? <Component sdk={sdk} params={params} />
          : null
      }
    </div>
  );
}
