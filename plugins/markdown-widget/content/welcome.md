# Welcome to IDP Portal

This is an **Internal Developer Platform** for managing and monitoring services across your cluster.

## Quick Links

- [Cluster Registry](/cluster-registry) — view all registered nodes
- [API Explorer](/api-explorer) — browse available APIs
- [Infrastructure](/infra) — infrastructure overview

## Features

- **Plugin system** — extend the platform with custom plugins
- **Widget dashboard** — compose pages from modular widgets defined in YAML
- **Cluster awareness** — every node auto-registers and heartbeats

## Getting Started

Add a new page by creating a `.yml` file in the `pages/` directory:

```yaml
id: my-page
title: My Page
route: /my-page
columns: 2
widgets:
  - plugin: markdown-widget
    widget: markdown
    size: 2
    params:
      file: welcome.md
```
