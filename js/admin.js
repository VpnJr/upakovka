// ====================================================
// ПАНЕЛЬ АДМИНИСТРАТОРА
//
// ⚙️ СМЕНИТЕ ПАРОЛЬ ниже перед публикацией!
// ====================================================

const ADMIN_PASSWORD = 'upakovka2025';  // ← ИЗМЕНИТЕ НА СВОЙ ПАРОЛЬ

let currentFilter = 'all';

function adminLogin() {
  const input = document.getElementById('admin-password');
  const error = document.getElementById('login-error');
  if (input.value === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    renderOrders();
    startClock();
    // Автообновление каждые 30 секунд
    setInterval(renderOrders, 30000);
  } else {
    input.classList.add('error');
    error.classList.add('show');
    input.value = '';
    setTimeout(() => {
      input.classList.remove('error');
      error.classList.remove('show');
    }, 2000);
  }
}

function startClock() {
  function tick() {
    const el = document.getElementById('admin-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('ru-RU');
  }
  tick();
  setInterval(tick, 1000);
}

function getOrders() {
  try { return JSON.parse(localStorage.getItem('upakovka_orders') || '[]'); }
  catch { return []; }
}

function saveOrders(orders) {
  localStorage.setItem('upakovka_orders', JSON.stringify(orders));
}

function renderOrders() {
  const allOrders = getOrders();
  const filtered = currentFilter === 'all'
    ? allOrders
    : allOrders.filter(o => o.status === currentFilter);

  updateStats(allOrders);

  const el = document.getElementById('orders-list');
  const noEl = document.getElementById('no-orders');

  if (filtered.length === 0) {
    el.innerHTML = '';
    noEl.style.display = 'block';
    return;
  }
  noEl.style.display = 'none';

  const statusLabel = { new: 'Новый', processing: 'В обработке', done: 'Выполнен' };
  const statusClass = { new: 'status-new', processing: 'status-processing', done: 'status-done' };

  el.innerHTML = filtered.map(o => `
    <div class="order-card ${o.status === 'new' ? 'status-new' : ''}">
      <div class="order-top">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="order-id">${o.id}</span>
          <span class="order-time">${o.time}</span>
        </div>
        <span class="order-status ${statusClass[o.status]}">${statusLabel[o.status]}</span>
      </div>

      <div class="order-phone">
        📞 ${o.phone}
        ${o.name && o.name !== 'Покупатель' ? `<span class="order-client-name">· ${o.name}</span>` : ''}
      </div>

      <div class="order-info-pills">
        <span class="info-pill">🚚 ${o.delivery}</span>
        <span class="info-pill">💳 ${o.payment}</span>
        ${o.address ? `<span class="info-pill">📍 ${o.address}</span>` : ''}
      </div>

      <div class="order-items-wrap">
        ${o.items.map(i => `
          <div class="order-item-pill">
            ${i.emoji} ${i.name} — <strong>${i.qty} шт.</strong>
          </div>
        `).join('')}
      </div>

      ${o.comment ? `<div style="font-size:13px;color:#666;margin-bottom:10px;">💬 ${o.comment}</div>` : ''}

      <div class="order-footer">
        <div class="order-total-price">${o.total} ₽</div>
        <div class="order-actions">
          <a class="order-action-btn" href="tel:${o.phone.replace(/\D/g,'')}">📞 Позвонить</a>
          ${o.status === 'new' ? `
            <button class="order-action-btn confirm-btn" onclick="setStatus('${o.id}', 'processing')">
              ✓ Принять
            </button>
          ` : ''}
          ${o.status === 'processing' ? `
            <button class="order-action-btn confirm-btn" onclick="setStatus('${o.id}', 'done')">
              📦 Выполнен
            </button>
          ` : ''}
          ${o.status === 'done' ? `
            <span style="font-size:13px;color:#2e7b4f;">✓ Завершён</span>
          ` : ''}
          <button class="order-action-btn" onclick="deleteOrder('${o.id}')">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
}

function setStatus(orderId, status) {
  const orders = getOrders();
  const o = orders.find(x => x.id === orderId);
  if (o) { o.status = status; saveOrders(orders); renderOrders(); }
}

function deleteOrder(orderId) {
  if (!confirm('Удалить заказ ' + orderId + '?')) return;
  saveOrders(getOrders().filter(o => o.id !== orderId));
  renderOrders();
}

function clearOrders() {
  if (!confirm('Удалить ВСЕ заказы? Это нельзя отменить.')) return;
  saveOrders([]);
  renderOrders();
}

function filterOrders(filter) {
  currentFilter = filter;
  document.querySelectorAll('.toolbar-right .btn-outline-sm').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('filter-' + filter);
  if (btn) btn.classList.add('active');
  renderOrders();
}

function updateStats(orders) {
  document.getElementById('stat-total').textContent = orders.length;
  document.getElementById('stat-new').textContent = orders.filter(o => o.status === 'new').length;
  document.getElementById('stat-processing').textContent = orders.filter(o => o.status === 'processing').length;
  document.getElementById('stat-done').textContent = orders.filter(o => o.status === 'done').length;
}

// Автовход если уже авторизован в этой сессии
if (sessionStorage.getItem('admin_auth') === '1') {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  renderOrders();
  startClock();
  setInterval(renderOrders, 30000);
}

document.getElementById('filter-all').classList.add('active');
