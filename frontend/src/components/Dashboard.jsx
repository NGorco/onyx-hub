import WidgetHost from './WidgetHost';
import { usePlugins } from '../hooks/usePlugins';

export default function Dashboard() {
  const { plugins, loading } = usePlugins();

  const widgets = plugins.flatMap(p =>
    (p.widgets || []).map(w => ({ plugin: p, widget: w }))
  );

  if (loading) {
    return <div className="p-8 text-gray-400">Loading widgets...</div>;
  }

  if (!widgets.length) {
    return (
      <div className="p-8 text-gray-400">
        No widgets found. Add a <code className="bg-gray-100 px-1 rounded">"widgets"</code> array to a plugin manifest.
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {widgets.map(({ plugin, widget }) => (
          <WidgetHost key={`${plugin.id}/${widget.id}`} plugin={plugin} widget={widget} />
        ))}
      </div>
    </div>
  );
}
