import { useState, useEffect } from 'react';

const methodColors = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function APIExplorer() {
  const [metadata, setMetadata] = useState(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  useEffect(() => {
    fetch('/api/metadata')
      .then(r => r.json())
      .then(setMetadata);
  }, []);

  if (!metadata) {
    return <div className="p-8 text-gray-500">Loading API catalog...</div>;
  }

  const allTags = [...new Set(metadata.apis.flatMap(a => a.tags || []))].sort();

  const filtered = metadata.apis.filter(api => {
    const matchesSearch =
      !search ||
      api.path.toLowerCase().includes(search.toLowerCase()) ||
      api.description.toLowerCase().includes(search.toLowerCase()) ||
      api.pluginId.toLowerCase().includes(search.toLowerCase());

    const matchesTag = !tagFilter || (api.tags || []).includes(tagFilter);

    return matchesSearch && matchesTag;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">API Explorer</h1>
          <p className="text-gray-500 text-sm mt-1">
            {metadata.total} endpoints registered &middot; Node: {metadata.nodeId}
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search APIs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
        />
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
        >
          <option value="">All tags</option>
          {allTags.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Method</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Path</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plugin</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((api, i) => (
              <tr key={api.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${methodColors[api.method] || 'bg-gray-100'}`}>
                    {api.method}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{api.path}</td>
                <td className="px-4 py-3 text-gray-600">{api.description}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
                    {api.pluginId}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {(api.tags || []).map(t => (
                      <span
                        key={t}
                        onClick={() => setTagFilter(t)}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-400">No APIs match your filters.</div>
        )}
      </div>
    </div>
  );
}
