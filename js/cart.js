// ====================================================
// КОРЗИНА — хранится в localStorage браузера
// ====================================================

function getCart() {
  try { return JSON.parse(localStorage.getItem('upakovka_cart') || '[]'); }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem('upakovka_cart', JSON.stringify(cart));
}

function addToCart(productId, qty) {
  qty = qty || 50;
  const cart = getCart();
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    cart.push({ id: productId, qty: qty });
  }
  saveCart(cart);
  updateCartUI();
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
  updateCartUI();
}

function clearCart() {
  saveCart([]);
  updateCartUI();
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function updateCartUI() {
  const count = getCartCount();
  const els = document.querySelectorAll('#cart-count, #cart-count-sidebar');
  els.forEach(el => { if (el) el.textContent = count; });
  renderCartItems();
}

function renderCartItems() {
  const cartItemsEl = document.getElementById('cart-items');
  const cartFooterEl = document.getElementById('cart-footer');
  const cartEmptyEl = document.getElementById('cart-empty');
  const cartTotalEl = document.getElementById('cart-total');
  if (!cartItemsEl) return;

  const cart = getCart();
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '';
    if (cartFooterEl) cartFooterEl.style.display = 'none';
    if (cartEmptyEl) cartEmptyEl.style.display = 'block';
    return;
  }

  if (cartEmptyEl) cartEmptyEl.style.display = 'none';
  if (cartFooterEl) cartFooterEl.style.display = 'block';

  cartItemsEl.innerHTML = cart.map(item => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    if (!p) return '';
    const total = (p.price * item.qty).toFixed(2);
    return `
      <div class="cart-item">
        <div class="cart-item-img">${p.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-qty">${item.qty} шт. × ${p.price.toFixed(2)} ₽</div>
        </div>
        <div class="cart-item-price">${total} ₽</div>
        <button class="cart-item-remove" onclick="removeFromCart(${p.id})" title="Удалить">✕</button>
      </div>
    `;
  }).join('');

  if (cartTotalEl) cartTotalEl.textContent = getCartTotal().toFixed(2) + ' ₽';
}

function openCart() {
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  renderCartItems();
}

function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
}
