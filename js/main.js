// ====================================================
// ГЛАВНАЯ СТРАНИЦА — каталог и фильтры
// ====================================================

let currentCat = 'all';

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = currentCat === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.cat === currentCat);

  const badgeLabels = { hit: 'Хит продаж', new: 'Новинка', eco: 'Эко', sale: 'Скидка' };
  const badgeClasses = { hit: 'badge-hit', new: 'badge-new', eco: 'badge-eco', sale: 'badge-sale' };

  grid.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="product-img">${p.emoji}</div>
      <div class="product-info">
        ${p.badge ? `<span class="product-badge ${badgeClasses[p.badge]}">${badgeLabels[p.badge]}</span>` : ''}
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.meta}</div>
        <div class="product-price">
          ${p.price.toFixed(2)} ₽
          ${p.oldPrice ? `<span class="old-price">${p.oldPrice.toFixed(2)} ₽</span>` : ''}
        </div>
        <button class="add-to-cart-btn" id="add-btn-${p.id}" onclick="handleAddToCart(${p.id})">
          + В корзину
        </button>
      </div>
    </div>
  `).join('');
}

function handleAddToCart(productId) {
  addToCart(productId, 50);
  const btn = document.getElementById('add-btn-' + productId);
  if (btn) {
    btn.textContent = '✓ Добавлено';
    btn.classList.add('added');
    setTimeout(() => {
      btn.textContent = '+ В корзину';
      btn.classList.remove('added');
    }, 1500);
  }
}

document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    renderProducts();
  });
});

// Инициализация
renderProducts();
updateCartUI();
