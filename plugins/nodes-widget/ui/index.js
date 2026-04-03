const { createElement: h, useState, useEffect } = window.React;

const STALE_MS = 15 * 2 * 1000;

function isStale(node) {
  return (Date.now() - new Date(node.lastHeartbeat).getTime()) > STALE_MS;
}

export default function NodesWidget() {
  const [nodes, setNodes] = useState([]);
  const [selfName, setSelfName] = useState(null);

  const load = () => {
    fetch('/api/health')
      .then(r => r.json())
      .then(h => setSelfName(h.nodeName || h.nodeId))
      .catch(() => {});

    fetch('/api/plugins/cluster-registry/_store?prefix=node:')
      .then(r => r.json())
      .then(data => {
        const items = (data.items || [])
          .map(i => { try { return JSON.parse(i.value); } catch { return null; } })
          .filter(Boolean)
          .sort((a, b) => isStale(a) - isStale(b) || a.nodeName.localeCompare(b.nodeName));
        setNodes(items);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const active = nodes.filter(n => !isStale(n)).length;

  return h('div', { className: 'flex flex-col gap-1' },
    h('div', { className: 'flex items-center justify-between mb-1' },
      h('span', { className: 'text-xs text-gray-400' }, active + ' active / ' + nodes.length + ' total'),
      h('button', { className: 'text-xs text-blue-500 hover:underline', onClick: load }, 'Refresh'),
    ),
    nodes.length === 0
      ? h('p', { className: 'text-gray-400 text-sm' }, 'No nodes found')
      : nodes.map(node => {
          const stale = isStale(node);
          const self = node.nodeName === selfName;
          return h('div', { key: node.nodeName, className: 'flex items-center gap-2 py-1 border-b border-gray-100 last:border-0' },
            h('span', { className: 'w-2 h-2 rounded-full flex-shrink-0 ' + (stale ? 'bg-red-400' : 'bg-green-400') }),
            self || !node.portalUrl
              ? h('span', { className: 'text-sm ' + (stale ? 'text-gray-400' : 'text-gray-700') }, node.nodeName)
              : h('a', {
                  href: node.portalUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'text-sm text-blue-600 hover:underline',
                }, node.nodeName),
            self && h('span', { className: 'text-xs text-blue-400 ml-auto' }, 'self'),
            !self && stale && h('span', { className: 'text-xs text-red-400 ml-auto' }, 'offline'),
          );
        }),
  );
}
