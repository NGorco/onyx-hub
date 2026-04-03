import Sidebar from './Sidebar';

export default function Layout({ plugins, loading, pages, children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar plugins={plugins} loading={loading} pages={pages || []} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
