import WidgetHost from './WidgetHost';
import { usePlugins } from '../hooks/usePlugins';

const COL_CLASS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const SPAN_CLASS = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
};

export default function DynamicPage({ page }) {
  const { plugins, loading } = usePlugins();

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  const colClass = COL_CLASS[page.columns] || 'grid-cols-3';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">{page.title}</h1>
      <div className={`grid ${colClass} gap-4`}>
        {page.widgets.map((wref, i) => {
          const plugin = plugins.find(p => p.id === wref.plugin);
          const widgetDef = plugin?.widgets?.find(w => w.id === wref.widget);

          if (!plugin || !widgetDef) {
            return (
              <div key={i} className={`${SPAN_CLASS[wref.size] || 'col-span-1'} bg-white rounded-xl border border-red-200 p-5`}>
                <p className="text-red-400 text-sm">
                  Widget not found: <code>{wref.plugin}/{wref.widget}</code>
                </p>
              </div>
            );
          }

          return (
            <div key={i} className={SPAN_CLASS[wref.size] || 'col-span-1'}>
              <WidgetHost plugin={plugin} widget={widgetDef} params={wref.params || {}} bare={wref.bare || false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
