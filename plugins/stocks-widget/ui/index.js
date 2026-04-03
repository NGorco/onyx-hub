const { createElement: h, useState, useEffect } = window.React;

const LABELS = {
  bitcoin:   { name: 'Bitcoin',   symbol: 'BTC' },
  ethereum:  { name: 'Ethereum',  symbol: 'ETH' },
  solana:    { name: 'Solana',    symbol: 'SOL' },
  cardano:   { name: 'Cardano',   symbol: 'ADA' },
  polkadot:  { name: 'Polkadot', symbol: 'DOT' },
};

function fmt(n) {
  if (n == null) return '-';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1)    return '$' + n.toFixed(2);
  return '$' + n.toFixed(4);
}

export default function MarketsWidget() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);

  const load = () =>
    fetch('/api/plugins/stocks-widget/data')
      .then(r => r.json())
      .then(d => { setData(d); setUpdated(new Date().toLocaleTimeString()); })
      .catch(e => setErr(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (err)   return h('p', { className: 'text-red-500 text-sm' }, 'Failed: ' + err);
  if (!data) return h('p', { className: 'text-gray-400 text-sm' }, 'Loading...');

  const rows = Object.entries(data).map(([id, v]) => ({
    id,
    ...LABELS[id],
    price: v.usd,
    change: v.usd_24h_change,
  }));

  return h('div', { className: 'flex flex-col gap-1' },
    rows.map(r =>
      h('div', { key: r.id, className: 'flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0' },
        h('div', { className: 'flex items-center gap-2' },
          h('span', { className: 'font-mono font-bold text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600' }, r.symbol),
          h('span', { className: 'text-sm text-gray-600' }, r.name),
        ),
        h('div', { className: 'text-right' },
          h('div', { className: 'font-semibold text-sm' }, fmt(r.price)),
          h('div', { className: 'text-xs ' + ((r.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600') },
            r.change != null ? ((r.change >= 0 ? '+' : '') + r.change.toFixed(2) + '%') : '-',
          ),
        ),
      )
    ),
    updated && h('div', { className: 'text-xs text-gray-300 mt-1 text-right' }, 'Updated ' + updated),
  );
}
