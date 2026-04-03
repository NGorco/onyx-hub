<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">34534534534</h1>
        <p class="text-gray-500 text-sm mt-1">
          {{ activeNodes.length }} active node(s)
          <span v-if="staleNodes.length">, {{ staleNodes.length }} offline</span>
          &middot; Heartbeat every {{ heartbeatSec }}s, evict after {{ missThreshold }} misses
        </p>
      </div>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              @click="load">Refresh</button>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-green-700">{{ activeNodes.length }}</div>
        <div class="text-xs text-green-600 mt-1">Active</div>
      </div>
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-yellow-700">{{ degradedNodes.length }}</div>
        <div class="text-xs text-yellow-600 mt-1">Degraded</div>
      </div>
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-red-700">{{ staleNodes.length }}</div>
        <div class="text-xs text-red-600 mt-1">Offline</div>
      </div>
    </div>

    <div v-if="nodesWithPortal.length" class="mb-6">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Navigate to node</div>
      <div class="flex flex-wrap gap-2">
        <a v-for="node in nodesWithPortal"
           :href="node.portalUrl"
           target="_blank" rel="noopener noreferrer"
           class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
           :class="isSelf(node)
             ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-default pointer-events-none'
             : isStale(node)
               ? 'bg-gray-50 border-gray-200 text-gray-400 pointer-events-none'
               : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'">
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :class="isStale(node) ? 'bg-red-400' : missedBeats(node) >= 1 ? 'bg-yellow-400' : 'bg-green-400'"></span>
          {{ node.nodeName }}
          <span v-if="isSelf(node)" class="text-xs opacity-60">(this)</span>
          <span v-else-if="!isStale(node)" class="text-gray-400">&#8599;</span>
        </a>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200">
            <th class="text-left px-4 py-3 font-medium text-gray-600">Node Name</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Capacity</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Last Heartbeat</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Missed Beats</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Started At</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Portal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in sortedNodes"
              class="border-b border-gray-100 hover:bg-gray-50"
              :class="{ 'opacity-50': isStale(node) }">
            <td class="px-4 py-3 font-medium">
              <div class="flex items-center gap-2">
                <a v-if="!isSelf(node) && node.portalUrl"
                   :href="node.portalUrl" target="_blank" rel="noopener noreferrer"
                   class="text-blue-600 hover:underline">{{ node.nodeName }}</a>
                <span v-else>{{ node.nodeName }}</span>
                <span v-if="isSelf(node)"
                      class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">self</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs px-2 py-1 rounded font-medium"
                    :class="statusColor(node)">{{ statusLabel(node) }}</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">
              {{ node.plugins }} plugins, {{ node.apis }} APIs
            </td>
            <td class="px-4 py-3 font-mono text-xs text-gray-500">
              {{ timeSince(node.lastHeartbeat) }}
            </td>
            <td class="px-4 py-3 text-xs text-gray-500">
              <span v-if="missedBeats(node) > 0" class="text-yellow-600 font-medium">
                {{ missedBeats(node) }} missed
              </span>
              <span v-else class="text-green-600">none</span>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-gray-400">
              {{ node.startedAt ? new Date(node.startedAt).toLocaleTimeString() : '-' }}
            </td>
            <td class="px-4 py-3 text-xs">
              <a v-if="node.portalUrl"
                 :href="node.portalUrl" target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
                 :class="{ 'pointer-events-none opacity-50': isStale(node) }">
                Open Portal &#8599;
              </a>
              <span v-else class="text-gray-400">-</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="nodes.length === 0" class="p-8 text-center text-gray-400">
        No nodes registered yet. Waiting for first heartbeat...
      </div>
    </div>
  </div>
</template>

<script>
({
  data: {
    nodes: [],
    selfNodeName: null,
    heartbeatSec: 15,
    missThreshold: 2
  },

  computed: {
    staleMs: function () {
      return this.heartbeatSec * this.missThreshold * 1000;
    },
    sortedNodes: function () {
      return this.nodes.slice().sort(function (a, b) {
        var aStale = this.isStale(a);
        var bStale = this.isStale(b);
        if (aStale !== bStale) return aStale ? 1 : -1;
        return a.nodeName.localeCompare(b.nodeName);
      }.bind(this));
    },
    activeNodes: function () {
      return this.nodes.filter(function (n) { return !this.isStale(n); }.bind(this));
    },
    staleNodes: function () {
      return this.nodes.filter(function (n) { return this.isStale(n); }.bind(this));
    },
    nodesWithPortal: function () {
      return this.sortedNodes.filter(function (n) { return !!n.portalUrl; });
    },
    degradedNodes: function () {
      var hbMs = this.heartbeatSec * 1000;
      var staleMs = this.staleMs;
      return this.nodes.filter(function (n) {
        var ms = Date.now() - new Date(n.lastHeartbeat).getTime();
        return ms > hbMs && ms <= staleMs;
      });
    }
  },

  methods: {
    load: function () {
      var self = this;
      fetch('/api/health')
        .then(function (r) { return r.json(); })
        .then(function (health) { self.selfNodeName = health.nodeName; })
        .catch(function () {});

      this.$sdk.store.list('node:')
        .then(function (data) {
          self.nodes = (data.items || []).map(function (i) {
            try { return JSON.parse(i.value); } catch (e) { return null; }
          }).filter(Boolean);
        })
        .catch(function (err) {
          console.error('Failed to load cluster nodes:', err);
        });
    },

    isStale: function (node) {
      return (Date.now() - new Date(node.lastHeartbeat).getTime()) > this.staleMs;
    },

    isSelf: function (node) {
      return node.nodeName === this.selfNodeName;
    },

    missedBeats: function (node) {
      return Math.floor(
        (Date.now() - new Date(node.lastHeartbeat).getTime()) / (this.heartbeatSec * 1000)
      );
    },

    statusLabel: function (node) {
      if (this.isStale(node)) return 'OFFLINE';
      if (this.missedBeats(node) >= 1) return 'DEGRADED';
      return 'HEALTHY';
    },

    statusColor: function (node) {
      if (this.isStale(node)) return 'bg-red-100 text-red-700';
      if (this.missedBeats(node) >= 1) return 'bg-yellow-100 text-yellow-700';
      return 'bg-green-100 text-green-700';
    },

    timeSince: function (isoStr) {
      var ms = Date.now() - new Date(isoStr).getTime();
      if (ms < 1000) return 'just now';
      var sec = Math.floor(ms / 1000);
      if (sec < 60) return sec + 's ago';
      var min = Math.floor(sec / 60);
      return min + 'm ' + (sec % 60) + 's ago';
    }
  },

})
</script>
