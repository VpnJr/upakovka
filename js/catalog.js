// ============================================================
// КАТАЛОГ — рендер товаров и фильтрация
// ============================================================

var currentCat = 'all';

var badgeLabel = {hit:'Хит продаж', new:'Новинка', eco:'Эко', sale:'Скидка'};
var badgeCls   = {hit:'badge-hit',  new:'badge-new', eco:'badge-eco', sale:'badge-sale'};

function renderCatalog(){
  var grid = document.getElementById('products-grid');
  if(!grid) return;

  var list = getProducts();
  if(currentCat !== 'all') list = list.filter(function(p){ return p.cat===currentCat; });

  if(!list.length){
    grid.innerHTML = '<div class="empty-state">Товары не найдены</div>';
    return;
  }

  grid.innerHTML = list.map(function(p){
    return '<div class="product-card" onclick="location.href=\'product.html?id='+p.id+'\'">'+
      '<div class="product-img">'+p.emoji+'</div>'+
      '<div class="product-info">'+
        (p.badge ? '<span class="product-badge '+badgeCls[p.badge]+'">'+badgeLabel[p.badge]+'</span>' : '')+
        '<div class="product-name">'+p.name+'</div>'+
        '<div class="product-meta">'+p.meta+'</div>'+
        '<div class="product-price">'+p.price.toFixed(2)+' ₽'+
          (p.oldPrice ? ' <span class="old-price">'+p.oldPrice.toFixed(2)+' ₽</span>' : '')+
        '</div>'+
        '<button class="add-to-cart-btn" onclick="event.stopPropagation();quickAdd('+p.id+',this)">+ В корзину</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

function quickAdd(id, btn){
  addToCart(id, 50);
  btn.textContent = '✓ Добавлено';
  btn.style.background = '#2e7b4f';
  setTimeout(function(){ btn.textContent = '+ В корзину'; btn.style.background=''; }, 1500);
}

// Фильтры категорий
document.querySelectorAll('.cat-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.cat-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    renderCatalog();
  });
});

// Слушаем изменения в localStorage (если товары обновились в другой вкладке)
window.addEventListener('storage', function(e){
  if(e.key === 'upakovka_products') renderCatalog();
});

renderCatalog();
updateCartBadge();
