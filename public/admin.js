(function () {
  const STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  const TABS = ['all', ...STATUSES];

  const state = {
    passcode: sessionStorage.getItem('cafe-admin-passcode') || '',
    activeTab: 'all',
    orders: [],
    pollHandle: null,
  };

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginBtn = document.getElementById('login-btn');
  const passcodeInput = document.getElementById('passcode');
  const loginError = document.getElementById('login-error');
  const tabsEl = document.getElementById('tabs');
  const statsEl = document.getElementById('stats');
  const ordersContainer = document.getElementById('orders-container');
  const lastUpdatedEl = document.getElementById('last-updated');

  loginBtn.addEventListener('click', attemptLogin);
  passcodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('export-btn').addEventListener('click', exportCsv);

  renderTabs();

  if (state.passcode) {
    enterDashboard();
  }

  async function attemptLogin() {
    const value = passcodeInput.value.trim();
    if (!value) return;
    state.passcode = value;
    const ok = await fetchOrders();
    if (ok) {
      sessionStorage.setItem('cafe-admin-passcode', value);
      enterDashboard();
    } else {
      loginError.textContent = 'Incorrect passcode.';
      loginError.classList.remove('hidden');
    }
  }

  function logout() {
    sessionStorage.removeItem('cafe-admin-passcode');
    state.passcode = '';
    clearInterval(state.pollHandle);
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
    passcodeInput.value = '';
  }

  function enterDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    fetchOrders();
    clearInterval(state.pollHandle);
    state.pollHandle = setInterval(fetchOrders, 5000);
  }

  function renderTabs() {
    tabsEl.innerHTML = TABS.map(
      (t) => `<button class="tab ${t === state.activeTab ? 'active' : ''}" data-tab="${t}">${capitalize(t)}</button>`
    ).join('');
    tabsEl.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        renderTabs();
        renderOrders();
      });
    });
  }

  async function fetchOrders() {
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { 'x-admin-passcode': state.passcode },
      });
      if (res.status === 401) return false;
      const data = await res.json();
      state.orders = data.orders;
      renderStats();
      renderOrders();
      lastUpdatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
      return true;
    } catch (err) {
      return false;
    }
  }

  function renderStats() {
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = state.orders.filter((o) => o.createdAt.startsWith(today));
    const revenueToday = todayOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0);
    const pending = state.orders.filter((o) => o.status === 'pending').length;
    const preparing = state.orders.filter((o) => o.status === 'preparing').length;

    statsEl.innerHTML = `
      <div class="stat"><div class="label">Orders today</div><div class="value">${todayOrders.length}</div></div>
      <div class="stat"><div class="label">Revenue today</div><div class="value">$${revenueToday.toFixed(2)}</div></div>
      <div class="stat"><div class="label">Pending</div><div class="value">${pending}</div></div>
      <div class="stat"><div class="label">Preparing</div><div class="value">${preparing}</div></div>
    `;
  }

  function renderOrders() {
    const filtered = state.activeTab === 'all'
      ? state.orders
      : state.orders.filter((o) => o.status === state.activeTab);

    if (filtered.length === 0) {
      ordersContainer.innerHTML = '<div class="empty-state">No orders here yet.</div>';
      return;
    }

    ordersContainer.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Time</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(renderRow).join('')}
        </tbody>
      </table>
    `;

    ordersContainer.querySelectorAll('.status-select').forEach((select) => {
      select.addEventListener('change', () => updateStatus(select.dataset.order, select.value));
    });
  }

  function renderRow(order) {
    const itemsHtml = order.items
      .map(
        (l) => `<div>${l.qty}× ${l.name}${l.syrups.length ? `<span class="meta"> + ${l.syrups.map((s) => s.name).join(', ')}</span>` : ''}</div>`
      )
      .join('');

    return `
      <tr>
        <td><strong>${order.orderNumber}</strong></td>
        <td>${new Date(order.createdAt + 'Z').toLocaleTimeString()}</td>
        <td>${escapeHtml(order.customerName)}<div class="meta">${escapeHtml(order.customerPhone)}</div>${order.note ? `<div class="meta">📝 ${escapeHtml(order.note)}</div>` : ''}</td>
        <td class="items-cell">${itemsHtml}</td>
        <td>$${order.total.toFixed(2)}</td>
        <td>
          <span class="status-pill status-${order.status}">${order.status}</span><br/>
          <select class="status-select" data-order="${order.orderNumber}">
            ${STATUSES.map((s) => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${capitalize(s)}</option>`).join('')}
          </select>
        </td>
      </tr>
    `;
  }

  async function updateStatus(orderNumber, status) {
    await fetch(`/api/admin/orders/${orderNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-passcode': state.passcode },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  }

  function exportCsv() {
    const url = `/api/admin/orders-export.csv?passcode=${encodeURIComponent(state.passcode)}`;
    window.open(url, '_blank');
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
