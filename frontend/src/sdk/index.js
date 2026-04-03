/**
 * Creates a plugin SDK instance scoped to a specific plugin.
 * Provides out-of-the-box tools for data storage, events, and API calls.
 */
export function createSdk(pluginId) {
  const base = `/api/plugins/${pluginId}`;

  return {
    pluginId,

    /** Generic fetch wrapper */
    fetch(path, options) {
      return fetch(path, options).then(r => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        const ct = r.headers.get('content-type') || '';
        return ct.includes('application/json') ? r.json() : r.text();
      });
    },

    /** Built-in key-value data store */
    store: {
      get(key) {
        return fetch(`${base}/_store/${encodeURIComponent(key)}`).then(r =>
          r.ok ? r.json() : null
        );
      },

      set(key, value) {
        return fetch(`${base}/_store/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        }).then(r => r.json());
      },

      list(prefix = '') {
        return fetch(`${base}/_store?prefix=${encodeURIComponent(prefix)}`).then(r =>
          r.json()
        );
      },

      delete(key) {
        return fetch(`${base}/_store/${encodeURIComponent(key)}`, {
          method: 'DELETE',
        });
      },
    },

    /** Event pub/sub via SSE */
    events: {
      subscribe(topics, callback) {
        const params = topics.map(t => `topics=${encodeURIComponent(t)}`).join('&');
        const es = new EventSource(`/api/events/stream?${params}`);

        es.onmessage = (e) => {
          try {
            callback(JSON.parse(e.data));
          } catch (err) {
            console.error('Event parse error:', err);
          }
        };

        es.onerror = () => {
          console.warn('SSE connection error, will reconnect...');
        };

        return () => es.close();
      },

      publish(topic, payload) {
        return fetch('/api/events/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, payload: JSON.stringify(payload) }),
        }).then(r => r.json());
      },
    },
  };
}
