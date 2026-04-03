import { useState, useEffect } from 'react';

const STALE_MS = 15 * 2 * 1000;

// In-memory store — shared across all hook instances
let cache = [];
let listeners = new Set();

function notify() {
  listeners.forEach(fn => fn([...cache]));
}

async function fetchNodes() {
  const [storeRes, healthRes] = await Promise.all([
    fetch('/api/plugins/cluster-registry/_store?prefix=node:'),
    fetch('/api/health'),
  ]);
  const storeData = await storeRes.json();
  const health = await healthRes.json();

  const nodes = (storeData.items || [])
    .map(i => { try { return JSON.parse(i.value); } catch { return null; } })
    .filter(Boolean);

  const selfName = health.nodeName || health.nodeId || null;

  cache = nodes.map(n => ({ ...n, isSelf: n.nodeName === selfName }));
  notify();
}

// Single SSE connection shared across all consumers
let sseSetup = false;
function ensureSSE() {
  if (sseSetup) return;
  sseSetup = true;
  const es = new EventSource('/api/events/stream?topics=cluster.heartbeat&topics=cluster.node.left');
  es.onmessage = () => fetchNodes().catch(() => {});
  es.onerror = () => { sseSetup = false; };
}

export function useNodes() {
  const [nodes, setNodes] = useState(cache);

  useEffect(() => {
    listeners.add(setNodes);
    if (cache.length === 0) fetchNodes().catch(() => {});
    ensureSSE();
    return () => listeners.delete(setNodes);
  }, []);

  return nodes;
}

export function isStale(node) {
  return (Date.now() - new Date(node.lastHeartbeat).getTime()) > STALE_MS;
}
