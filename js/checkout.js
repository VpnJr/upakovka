// ====================================================
// ОФОРМЛЕНИЕ ЗАКАЗА
// ====================================================

const DELIVERY_COSTS = { courier: 300, pickup: 0, cdek: 500 };
const DELIVERY_LABELS = { courier: 'Курьер (1–2 дня)', pickup: 'Самовывоз', cdek: 'СДЭК / Почта (3–5 дней)' };

function getCurrentDelivery() {
  const el = document.querySelector('input[name="delivery"]:checked');
  return el ? el.value : 'courier';
}

function getCurrentPayment() {
  const el = document.querySelector('input[name="payment"]:checked');
  return el ? el.value : 'cash';
}

function updateDelivery() {
  const type = getCurrentDelivery();
  const cost = DELIVERY_COSTS[type];
  const addressField = document.getElementById('address-field');
  const summaryDelivery = document.getElementById('summary-delivery');
  const summaryTotal = document.getElementById('summary-total');

  if (addressField) addressField.style.display = type === 'pickup' ? 'none' : 'flex';
  if (summaryDelivery) summaryDelivery.textContent = cost === 0 ? 'Бесплатно' : cost + ' ₽';

  const goods = getCartTotal();
  if (summaryTotal) summaryTotal.textContent = (goods + cost).toFixed(2) + ' ₽';
}

function renderSummary() {
  const cart = getCart();
  const el = document.getElementById('summary-items');
  if (!el) return;

  el.innerHTML = cart.map(item => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    if (!p) return '';
    return `
      <div class="summary-item">
        <div class="summary-item-img">${p.emoji}</div>
        <div class="summary-item-info">
          <div class="summary-item-name">${p.name}</div>
          <div class="summary-item-qty">${item.qty} шт. × ${p.price.toFixed(2)} ₽</div>
        </div>
        <div class="summary-item-price">${(p.price * item.qty).toFixed(2)} ₽</div>
      </div>
    `;
  }).join('');

  const goods = getCartTotal();
  const delivery = DELIVERY_COSTS[getCurrentDelivery()];
  const goodsEl = document.getElementById('summary-goods');
  const totalEl = document.getElementById('summary-total');
  if (goodsEl) goodsEl.textContent = goods.toFixed(2) + ' ₽';
  if (totalEl) totalEl.textContent = (goods + delivery).toFixed(2) + ' ₽';
}

function formatPhone(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 10);
  let fmt = '';
  if (v.length > 0) fmt += '(' + v.slice(0, 3);
  if (v.length >= 3) fmt += ') ' + v.slice(3, 6);
  if (v.length >= 6) fmt += '-' + v.slice(6, 8);
  if (v.length >= 8) fmt += '-' + v.slice(8, 10);
  input.value = fmt;
}

function submitOrder() {
  const phoneRaw = document.getElementById('f-phone').value.replace(/\D/g, '');
  const phoneInput = document.getElementById('f-phone');
  const phoneError = document.getElementById('phone-error');

  if (phoneRaw.length < 10) {
    phoneInput.classList.add('error');
    phoneError.classList.add('show');
    phoneInput.focus();
    return;
  }
  phoneInput.classList.remove('error');
  phoneError.classList.remove('show');

  const name = document.getElementById('f-name').value.trim() || 'Покупатель';
  const phone = '+7 ' + document.getElementById('f-phone').value;
  const address = document.getElementById('f-address') ? document.getElementById('f-address').value.trim() : '';
  const comment = document.getElementById('f-comment').value.trim();
  const delivery = getCurrentDelivery();
  const payment = getCurrentPayment();
  const paymentLabel = payment === 'cash' ? 'Наличными при получении' : 'Картой';
  const deliveryCost = DELIVERY_COSTS[delivery];
  const cart = getCart();
  const goods = getCartTotal();
  const total = (goods + deliveryCost).toFixed(2);
  const orderId = 'UP-' + Date.now().toString().slice(-5);
  const orderTime = new Date().toLocaleString('ru-RU');

  const order = {
    id: orderId,
    time: orderTime,
    name: name,
    phone: phone,
    address: address,
    comment: comment,
    delivery: DELIVERY_LABELS[delivery],
    deliveryCost: deliveryCost,
    payment: paymentLabel,
    items: cart.map(item => {
      const p = PRODUCTS.find(pr => pr.id === item.id);
      return p ? { name: p.name, emoji: p.emoji, qty: item.qty, price: p.price } : null;
    }).filter(Boolean),
    total: total,
    status: 'new'
  };

  // Сохраняем заказ в localStorage (откуда читает admin.html)
  const orders = JSON.parse(localStorage.getItem('upakovka_orders') || '[]');
  orders.unshift(order);
  localStorage.setItem('upakovka_orders', JSON.stringify(orders));

  // Очищаем корзину
  clearCart();

  // Показываем экран успеха
  document.getElementById('checkout-form-section').style.display = 'none';
  document.getElementById('success-section').style.display = 'block';
  document.getElementById('success-message').textContent =
    `Мы скоро позвоним на номер ${phone} для подтверждения.`;

  document.getElementById('receipt').innerHTML = `
    <div class="receipt-row"><span>Номер заказа</span><span>${orderId}</span></div>
    <div class="receipt-row"><span>Телефон</span><span>${phone}</span></div>
    <div class="receipt-row"><span>Доставка</span><span>${DELIVERY_LABELS[delivery]}</span></div>
    <div class="receipt-row"><span>Оплата</span><span>${paymentLabel}</span></div>
    <div class="receipt-row"><span>Сумма</span><span>${total} ₽</span></div>
  `;
}

// Инициализация
renderSummary();
updateCartUI();
