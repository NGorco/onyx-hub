class RepoTable extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    connectedCallback() {
      this.renderInitial();
    }
  
    async loadData() {
      this.setLoading(true);
  
      try {
        const res = await fetch('/api/components/github-repo/get_repos', {method: 'POST'});
        if (!res.ok) throw new Error('Failed to fetch');
        const repos = await res.json();
        this.renderTable(repos);
      } catch (err) {
        this.shadowRoot.querySelector('#output').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
      }
  
      this.setLoading(false);
    }
  
    setLoading(isLoading) {
      const btn = this.shadowRoot.querySelector('button');
      if (btn) {
        btn.disabled = isLoading;
        btn.textContent = isLoading ? 'Loading...' : 'Load Repos';
      }
    }
  
    renderInitial() {
      const style = `
        <style>
          button {
            padding: 8px 16px;
            margin-bottom: 16px;
            font-size: 14px;
            cursor: pointer;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-family: sans-serif;
          }
          th, td {
            padding: 8px;
            border-bottom: 1px solid #ccc;
            text-align: left;
          }
          th {
            background: #f5f5f5;
          }
          img {
            width: 32px;
            height: 32px;
            border-radius: 50%;
          }
          a {
            color: #0366d6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      `;
  
      const html = `
        ${style}
        <button id="loadBtn">Load Repos</button>
        <div id="output"></div>
      `;
  
      this.shadowRoot.innerHTML = html;
  
      this.shadowRoot.querySelector('#loadBtn').addEventListener('click', () => this.loadData());
    }
  
    renderTable(repos) {
      const rows = repos.map(repo => `
        <tr>
          <td><img src="${repo.owner.avatar_url}" alt="avatar" /></td>
          <td><a href="${repo.html_url}" target="_blank">${repo.name}</a></td>
          <td>${repo.language || '—'}</td>
          <td>${repo.description || '—'}</td>
          <td>${new Date(repo.updated_at).toLocaleString()}</td>
          <td><a href="${repo.html_url}/actions" target="_blank">GitHub Actions</a></td>
        </tr>
      `).join('');
  
      this.shadowRoot.querySelector('#output').innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Name</th>
              <th>Language</th>
              <th>Description</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }
  }
  
  customElements.define('repo-table', RepoTable);
  