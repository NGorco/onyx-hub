const { createElement: h, useEffect, useRef } = window.React;

const VUE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/vue/1.0.28/vue.min.js';

function loadScript(src) {
  if (src === VUE_CDN && window.Vue) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

function parseVue(text) {
  const tplMatch = text.match(/<template>([\s\S]*?)<\/template>/);
  const scriptMatch = text.match(/<script>([\s\S]*?)<\/script>/);
  return {
    template: tplMatch ? tplMatch[1].trim() : '<div></div>',
    options: scriptMatch ? (0, eval)(scriptMatch[1].trim()) : {}
  };
}

function ClusterRegistry({ sdk }) {
  const containerRef = useRef(null);
  const vmRef = useRef(null);

  useEffect(() => {
    let interval;

    // Vue 1 replaces `el` with its own rendered node — mount into a child
    // so React's container div is never touched by Vue.
    const mount = document.createElement('div');
    containerRef.current.appendChild(mount);

    Promise.all([
      loadScript(VUE_CDN),
      fetch('/api/plugins/cluster-registry/ui/ClusterRegistry.vue').then(r => r.text())
    ]).then(([_, vueText]) => {
      if (!containerRef.current) return;
      const { template, options } = parseVue(vueText);

      const vm = new window.Vue({
        el: mount,
        template,
        data: typeof options.data === 'function' ? options.data() : options.data,
        computed: options.computed,
        methods: options.methods
      });

      vm.$sdk = sdk;
      vmRef.current = vm;
      vm.load();
      interval = setInterval(() => vm.load(), 5000);
    }).catch(err => {
      console.error('ClusterRegistry load error:', err);
      if (containerRef.current) {
        containerRef.current.textContent = 'Failed to load plugin: ' + err.message;
      }
    });

    return () => {
      clearInterval(interval);
      if (vmRef.current) {
        const el = vmRef.current.$el;
        vmRef.current.$destroy();
        el && el.parentNode && el.parentNode.removeChild(el);
      }
    };
  }, []);

  return h('div', { ref: containerRef });
}

export default ClusterRegistry;
