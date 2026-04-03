const { createElement: h, useState, useEffect } = window.React;

function DataSourceForm({ onSubmit }) {
  const [form, setForm] = useState({ id: '', name: '', type: 'postgres', owner: '', description: '', connectionHint: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return h('div', { className: 'bg-white rounded-lg border border-gray-200 p-6 mb-6' },
    h('h3', { className: 'text-lg font-semibold mb-4' }, 'Register Data Source'),
    h('div', { className: 'grid grid-cols-2 gap-4' },
      h('input', { placeholder: 'ID (e.g. analytics-db)', value: form.id, onChange: set('id'), className: 'px-3 py-2 border border-gray-300 rounded-lg text-sm' }),
      h('input', { placeholder: 'Name', value: form.name, onChange: set('name'), className: 'px-3 py-2 border border-gray-300 rounded-lg text-sm' }),
      h('select', { value: form.type, onChange: set('type'), className: 'px-3 py-2 border border-gray-300 rounded-lg text-sm' },
        h('option', { value: 'postgres' }, 'PostgreSQL'),
        h('option', { value: 'mysql' }, 'MySQL'),
        h('option', { value: 'snowflake' }, 'Snowflake'),
        h('option', { value: 'bigquery' }, 'BigQuery'),
        h('option', { value: 'kafka' }, 'Kafka'),
        h('option', { value: 's3' }, 'S3'),
        h('option', { value: 'rest-api' }, 'REST API'),
        h('option', { value: 'graphql' }, 'GraphQL'),
        h('option', { value: 'other' }, 'Other')
      ),
      h('input', { placeholder: 'Owner (team/person)', value: form.owner, onChange: set('owner'), className: 'px-3 py-2 border border-gray-300 rounded-lg text-sm' }),
      h('input', { placeholder: 'Description', value: form.description, onChange: set('description'), className: 'col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm' }),
      h('input', { placeholder: 'Connection hint (e.g. host:port/db)', value: form.connectionHint, onChange: set('connectionHint'), className: 'col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm' })
    ),
    h('button', {
      className: 'mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700',
      onClick: () => { if (form.id && form.name) { onSubmit(form); setForm({ id: '', name: '', type: 'postgres', owner: '', description: '', connectionHint: '' }); } }
    }, 'Register')
  );
}

const typeColors = {
  postgres: 'bg-blue-100 text-blue-700',
  mysql: 'bg-orange-100 text-orange-700',
  snowflake: 'bg-cyan-100 text-cyan-700',
  bigquery: 'bg-indigo-100 text-indigo-700',
  kafka: 'bg-purple-100 text-purple-700',
  s3: 'bg-yellow-100 text-yellow-700',
  'rest-api': 'bg-green-100 text-green-700',
  graphql: 'bg-pink-100 text-pink-700',
};

function DataCatalog({ sdk }) {
  const [sources, setSources] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    sdk.store.list('source:').then(data => {
      const items = (data.items || []).map(i => {
        try { return JSON.parse(i.value); } catch { return null; }
      }).filter(Boolean);
      setSources(items);
    });
  };

  useEffect(() => { load(); }, []);

  const handleRegister = async (source) => {
    await sdk.store.set('source:' + source.id, { ...source, registeredAt: new Date().toISOString() });
    load();
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await sdk.store.delete('source:' + id);
    load();
  };

  const filtered = sources.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase()) ||
    (s.owner || '').toLowerCase().includes(search.toLowerCase())
  );

  return h('div', null,
    h('div', { className: 'flex items-center justify-between mb-6' },
      h('div', null,
        h('h1', { className: 'text-2xl font-bold' }, 'Data Catalog'),
        h('p', { className: 'text-gray-500 text-sm mt-1' }, sources.length + ' data source(s) registered')
      ),
      h('button', {
        className: 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700',
        onClick: () => setShowForm(!showForm)
      }, showForm ? 'Cancel' : '+ Register Source')
    ),
    showForm && h(DataSourceForm, { onSubmit: handleRegister }),
    h('input', {
      type: 'text', placeholder: 'Search sources...',
      value: search, onChange: (e) => setSearch(e.target.value),
      className: 'w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-sm'
    }),
    h('div', { className: 'bg-white rounded-lg border border-gray-200 overflow-hidden' },
      h('table', { className: 'w-full text-sm' },
        h('thead', null,
          h('tr', { className: 'bg-gray-50 border-b border-gray-200' },
            h('th', { className: 'text-left px-4 py-3 font-medium text-gray-600' }, 'Name'),
            h('th', { className: 'text-left px-4 py-3 font-medium text-gray-600' }, 'Type'),
            h('th', { className: 'text-left px-4 py-3 font-medium text-gray-600' }, 'Owner'),
            h('th', { className: 'text-left px-4 py-3 font-medium text-gray-600' }, 'Description'),
            h('th', { className: 'text-left px-4 py-3 font-medium text-gray-600 w-20' }, '')
          )
        ),
        h('tbody', null,
          filtered.map(s =>
            h('tr', { key: s.id, className: 'border-b border-gray-100 hover:bg-gray-50' },
              h('td', { className: 'px-4 py-3 font-medium' }, s.name,
                h('div', { className: 'text-xs text-gray-400 font-mono' }, s.id)
              ),
              h('td', { className: 'px-4 py-3' },
                h('span', { className: 'text-xs px-2 py-1 rounded font-medium ' + (typeColors[s.type] || 'bg-gray-100 text-gray-600') }, s.type)
              ),
              h('td', { className: 'px-4 py-3 text-gray-600' }, s.owner || '-'),
              h('td', { className: 'px-4 py-3 text-gray-600' }, s.description || '-'),
              h('td', { className: 'px-4 py-3' },
                h('button', { className: 'text-red-400 hover:text-red-600 text-xs', onClick: () => handleDelete(s.id) }, 'Remove')
              )
            )
          )
        )
      ),
      filtered.length === 0 && h('div', { className: 'p-8 text-center text-gray-400' }, 'No data sources found.')
    )
  );
}

export default DataCatalog;
