const { createElement: h, useState, useEffect, useRef } = window.React;

function ServiceHealth({ sdk }) {
  const [health, setHealth] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const check = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
      setError(null);
      setHistory(prev => [...prev.slice(-19), { ...data, checkedAt: new Date().toISOString() }]);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (!health && !error) {
    return h('div', { className: 'text-gray-500' }, 'Checking health...');
  }

  const statusColor = error ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200';

  return h('div', null,
    h('div', { className: 'flex items-center justify-between mb-6' },
      h('div', null,
        h('h1', { className: 'text-2xl font-bold' }, 'Service Health'),
        h('p', { className: 'text-gray-500 text-sm mt-1' }, 'Auto-refreshes every 10 seconds')
      ),
      h('button', {
        className: 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700',
        onClick: check
      }, 'Check Now')
    ),

    // Current status card
    h('div', { className: 'rounded-lg border p-6 mb-6 ' + statusColor },
      h('div', { className: 'flex items-center justify-between' },
        h('div', null,
          h('div', { className: 'text-lg font-bold' }, error ? 'Unhealthy' : health.status.toUpperCase()),
          h('div', { className: 'text-sm mt-1' }, error ? error : 'Node: ' + health.nodeId)
        ),
        !error && h('div', { className: 'text-right text-sm' },
          h('div', null, health.plugins + ' plugin(s)'),
          h('div', null, health.apis + ' API(s)')
        )
      )
    ),

    // Health check history
    history.length > 0 && h('div', { className: 'bg-white rounded-lg border border-gray-200 overflow-hidden' },
      h('div', { className: 'px-4 py-3 border-b border-gray-200 bg-gray-50' },
        h('span', { className: 'text-sm font-medium text-gray-600' }, 'Recent Checks')
      ),
      h('div', { className: 'divide-y divide-gray-100' },
        [...history].reverse().map((entry, i) =>
          h('div', { key: i, className: 'flex items-center justify-between px-4 py-2 text-sm' },
            h('span', { className: 'font-mono text-xs text-gray-500' }, entry.checkedAt),
            h('span', { className: 'text-xs px-2 py-0.5 rounded ' + (entry.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') },
              entry.nodeId || 'unknown'
            )
          )
        )
      )
    )
  );
}

export default ServiceHealth;
