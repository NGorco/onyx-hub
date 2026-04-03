import { NavLink } from 'react-router-dom';
import { useNodes, isStale } from '../hooks/useNodes';

const iconMap = {
  home: '\u2302',
  puzzle: '\u29C9',
  database: '\u2731',
  health: '\u2665',
  api: '\u2726',
};

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      <span className="text-lg w-5 text-center">{iconMap[icon] || iconMap.puzzle}</span>
      {label}
    </NavLink>
  );
}

function NodeLink({ node }) {
  const stale = isStale(node);
  if (node.isSelf) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
        <span className="truncate">{node.nodeName}</span>
        <span className="ml-auto text-xs text-blue-400">self</span>
      </div>
    );
  }
  return (
    <a
      href={node.portalUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg transition ${
        stale || !node.portalUrl
          ? 'text-gray-400 cursor-default pointer-events-none'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stale ? 'bg-red-400' : 'bg-green-400'}`} />
      <span className="truncate">{node.nodeName}</span>
      {!stale && node.portalUrl && <span className="ml-auto text-gray-400 text-xs">↗</span>}
    </a>
  );
}

export default function Sidebar({ plugins, loading, pages }) {
  const nodes = useNodes();
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
      <div className="mb-6 px-4">
        <h1 className="text-lg font-bold text-gray-800">IDP 3434</h1>
        <p className="text-xs text-gray-400 mt-1">Internal Developer Platform</p>
      </div>

      <nav className="flex-1 space-y-1">
        <NavItem to="/" label="Home" icon="home" />
        <NavItem to="/api-explorer" label="API Explorer" icon="api" />

        {pages.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pages</span>
            </div>
            {pages.map(page => (
              <NavItem key={page.id} to={page.route} label={page.title} icon="health" />
            ))}
          </>
        )}

        {!loading && plugins.filter(p => p.hasUi && p.ui?.route).length > 0 && (
          <>
            <div className="pt-4 pb-2 px-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Plugins
              </span>
            </div>
            {plugins
              .filter(p => p.hasUi && p.ui?.route)
              .map(p => (
                <NavItem
                  key={p.id}
                  to={p.ui.route}
                  label={p.ui.nav?.label || p.name}
                  icon={p.ui.nav?.icon || 'puzzle'}
                />
              ))}
          </>
        )}
      </nav>

      {nodes.length > 0 && (
        <>
          <div className="pt-4 pb-2 px-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Cluster
            </span>
          </div>
          {nodes.map(n => <NodeLink key={n.nodeName} node={n} />)}
        </>
      )}

      <div className="mt-auto pt-4 border-t border-gray-200 px-4">
        <p className="text-xs text-gray-400">
          {loading ? 'Loading...' : `${plugins.length} plugin(s) loaded`}
        </p>
      </div>
    </aside>
  );
}
