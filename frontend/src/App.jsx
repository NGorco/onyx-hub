import { Routes, Route, Link } from 'react-router-dom';
import Layout from './components/Layout';
import APIExplorer from './components/APIExplorer';
import PluginHost from './components/PluginHost';
import DynamicPage from './components/DynamicPage';
import { usePlugins } from './hooks/usePlugins';
import { usePages } from './hooks/usePages';

function Home() {
  const { plugins, loading } = usePlugins();

  if (loading) return <div className="p-8">Loading portal...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Developer Portal</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map(p => (
          <Link
            key={p.id}
            to={p.ui?.route || '/'}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold mb-2">{p.name}</h2>
            <p className="text-gray-600 text-sm mb-3">{p.description}</p>
            <div className="flex gap-2">
              {p.hasUi && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">UI</span>}
              {p.hasBe && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">BE</span>}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">v{p.version}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { plugins, loading } = usePlugins();
  const { pages, loading: pagesLoading } = usePages();

  const anyLoading = loading || pagesLoading;

  return (
    <Layout plugins={plugins} loading={loading} pages={pages}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/api-explorer" element={<APIExplorer />} />

        {/* YAML-managed pages */}
        {pages.map(page => (
          <Route
            key={page.id}
            path={page.route}
            element={<DynamicPage page={page} />}
          />
        ))}

        {/* Plugin full pages */}
        {plugins
          .filter(p => p.hasUi && p.ui?.route)
          .map(p => (
            <Route
              key={p.id}
              path={p.ui.route}
              element={<PluginHost plugin={p} />}
            />
          ))}

        <Route path="*" element={
          anyLoading
            ? <div className="p-8 text-gray-400">Loading...</div>
            : <div className="p-8 text-gray-400">Page not found</div>
        } />
      </Routes>
    </Layout>
  );
}
