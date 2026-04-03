const { createElement: h, useState, useEffect, useRef } = window.React;

const MARKED_CDN = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';

function loadMarked() {
  if (window.marked) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = MARKED_CDN;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load marked'));
    document.head.appendChild(s);
  });
}

// Inject scoped markdown styles once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .md-body { line-height: 1.6; color: #374151; }
    .md-body h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 .75rem; color: #111827; }
    .md-body h2 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 .5rem; color: #111827; }
    .md-body h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 .4rem; color: #1f2937; }
    .md-body p  { margin: 0 0 .75rem; }
    .md-body ul, .md-body ol { margin: 0 0 .75rem 1.25rem; }
    .md-body li { margin-bottom: .25rem; }
    .md-body a  { color: #2563eb; text-decoration: underline; }
    .md-body code { background: #f3f4f6; padding: .1em .35em; border-radius: .25rem; font-size: .875em; font-family: monospace; }
    .md-body pre { background: #1f2937; color: #f9fafb; padding: .75rem 1rem; border-radius: .5rem; overflow-x: auto; margin: 0 0 .75rem; }
    .md-body pre code { background: none; padding: 0; color: inherit; font-size: .8125rem; }
    .md-body blockquote { border-left: 3px solid #d1d5db; margin: 0 0 .75rem; padding-left: .75rem; color: #6b7280; }
    .md-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
    .md-body table { width: 100%; border-collapse: collapse; margin: 0 0 .75rem; font-size: .875rem; }
    .md-body th { background: #f9fafb; text-align: left; padding: .4rem .75rem; border: 1px solid #e5e7eb; font-weight: 600; }
    .md-body td { padding: .4rem .75rem; border: 1px solid #e5e7eb; }
  `;
  document.head.appendChild(style);
}

export default function MarkdownWidget({ params = {} }) {
  const [html, setHtml] = useState('');
  const [err, setErr] = useState(null);

  useEffect(() => {
    injectStyles();
    const file = params.file;
    if (!file) { setErr('No file specified (set params.file in the page YAML)'); return; }

    Promise.all([
      loadMarked(),
      fetch(`/api/plugins/markdown-widget/content?file=${encodeURIComponent(file)}`).then(r => {
        if (!r.ok) throw new Error(`${r.status} — ${file}`);
        return r.text();
      })
    ])
      .then(([_, md]) => setHtml(window.marked.parse(md)))
      .catch(e => setErr(e.message));
  }, [params.file]);

  if (err)  return h('p', { className: 'text-red-500 text-sm' }, 'Error: ' + err);
  if (!html) return h('p', { className: 'text-gray-400 text-sm' }, 'Loading...');

  return h('div', { className: 'md-body', dangerouslySetInnerHTML: { __html: html } });
}
