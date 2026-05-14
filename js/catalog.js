var catalogState = { cat:'all', subCat:'', sort:'default', search:'', priceMin:null, priceMax:null, badges:[] };

var BADGE_LABEL = {hit:'Хит продаж', new:'Новинка', eco:'Эко', sale:'Скидка'};
var BADGE_CLS   = {hit:'badge-hit',  new:'badge-new', eco:'badge-eco', sale:'badge-sale'};

function getFilteredList(){
  var list = getProducts();
  if(catalogState.cat !== 'all')
    list = list.filter(function(p){ return p.cat === catalogState.cat; });
  if(catalogState.subCat)
    list = list.filter(function(p){ return p.subCat === catalogState.subCat; });
  if(catalogState.search){
    var q = catalogState.search.toLowerCase();
    list = list.filter(function(p){
      return p.name.toLowerCase().indexOf(q) !== -1 || p.meta.toLowerCase().indexOf(q) !== -1;
    });
  }
  if(catalogState.priceMin !== null && !isNaN(catalogState.priceMin))
    list = list.filter(function(p){ return p.price >= catalogState.priceMin; });
  if(catalogState.priceMax !== null && !isNaN(catalogState.priceMax))
    list = list.filter(function(p){ return p.price <= catalogState.priceMax; });
  if(catalogState.badges.length)
    list = list.filter(function(p){ return catalogState.badges.indexOf(p.badge) !== -1; });
  list = list.slice();
  if(catalogState.sort === 'price_asc')  list.sort(function(a,b){ return a.price - b.price; });
  if(catalogState.sort === 'price_desc') list.sort(function(a,b){ return b.price - a.price; });
  if(catalogState.sort === 'name')       list.sort(function(a,b){ return a.name.localeCompare(b.name,'ru'); });
  return list;
}

// Нижняя часть карточки — зависит от того, есть ли товар в корзине
function getCardCartHtml(productId, pack){
  var cart   = getCart();
  var inCart = cart.find(function(i){ return i.id === productId; });
  var curQty = inCart ? inCart.qty : (window._cardQtys[productId] || pack);

  var ctrl =
    '<div class="card-qty-ctrl">' +
      '<button onclick="cardQty(' + productId + ',' + (-pack) + ')">−</button>' +
      '<span id="cq-' + productId + '">' + curQty + '</span>' +
      '<button onclick="cardQty(' + productId + ',' + pack + ')">+</button>' +
    '</div>';

  if(inCart){
    // Строка 1: счётчик + кнопка "+ Ещё"
    // Строка 2: зелёная надпись "В корзине: X шт."
    return (
      '<div class="card-ctrl-row">' +
        ctrl +
        '<button class="add-cart-btn card-add-btn card-add-more" id="ca-' + productId + '" onclick="cardAdd(' + productId + ')">+ Ещё</button>' +
      '</div>' +
      '<span class="card-in-cart-lbl">✓ В корзине: <b>' + inCart.qty + ' шт.</b></span>'
    );
  }
  // Обычный вид: счётчик на всю ширину, кнопка под ним на всю ширину
  return (
    '<div class="card-ctrl-row">' + ctrl + '</div>' +
    '<button class="add-cart-btn card-add-full" id="ca-' + productId + '" onclick="cardAdd(' + productId + ')">В корзину</button>'
  );
}

function renderCatalog(){
  var grid = document.getElementById('products-grid');
  if(!grid) return;
  var list = getFilteredList();

  var countEl = document.getElementById('catalog-count');
  if(countEl){
    var n = list.length;
    countEl.textContent = n + ' ' + (n===1 ? 'товар' : n<5 ? 'товара' : 'товаров');
  }

  if(!list.length){
    grid.innerHTML = '<div class="catalog-empty"><div style="font-size:48px">🔍</div><p>Ничего не найдено</p><button class="btn-outline" onclick="resetFilters()">Сбросить фильтры</button></div>';
    return;
  }

  grid.innerHTML = list.map(function(p){
    var photo = getPhoto(p.id);
    var img = photo
      ? '<img src="' + photo + '" alt="' + p.name + '" loading="lazy">'
      : '<div class="card-emoji">' + p.emoji + '</div>';
    var pack = p.packQty || 1;
    var packInfo = pack > 1
      ? '<div class="product-pack">В пачке: <b>' + pack + ' шт.</b></div>'
      : '';
    var badge = p.badge
      ? '<span class="product-badge ' + BADGE_CLS[p.badge] + '">' + BADGE_LABEL[p.badge] + '</span>'
      : '';
    var disc = p.oldPrice
      ? '<span class="product-discount">−' + Math.round((1-p.price/p.oldPrice)*100) + '%</span>'
      : '';
    var oldPriceHtml = p.oldPrice
      ? '<div class="product-old">' + p.oldPrice.toFixed(2) + ' ₽</div>'
      : '';

    return [
      '<div class="product-card" onclick="location.href=\'product.html?id=' + p.id + '\'">',
        '<div class="product-img">' + img + badge + disc + '</div>',
        '<div class="product-info">',
          '<div class="product-name">' + p.name + '</div>',
          '<div class="product-meta">' + p.meta + '</div>',
          packInfo,
          '<div class="product-price-row">',
            '<div class="product-price">' + p.price.toFixed(2) + ' ₽</div>',
            oldPriceHtml,
          '</div>',
          '<div class="card-cart-row" onclick="event.stopPropagation()" id="ccr-' + p.id + '">',
            getCardCartHtml(p.id, pack),
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }).join('');
}

// ── Счётчики на карточках ──────────────────────────────
window._cardQtys = {};

function cardQty(id, delta){
  var p    = getProducts().find(function(x){ return x.id === id; });
  var pack = p && p.packQty ? p.packQty : 1;
  var cart  = getCart();
  var inCart = cart.find(function(i){ return i.id === id; });
  // Базовое количество: если в корзине — от него, иначе от выбранного
  var base = inCart ? inCart.qty : (window._cardQtys[id] || pack);
  var next = Math.max(pack, base + delta);
  window._cardQtys[id] = next;
  // Если товар уже в корзине — сразу обновляем корзину и карточку
  if(inCart){
    updateCartQty(id, next);
    var ccr = document.getElementById('ccr-' + id);
    if(ccr) ccr.innerHTML = getCardCartHtml(id, pack);
  } else {
    var el = document.getElementById('cq-' + id);
    if(el) el.textContent = next;
  }
}

function cardAdd(id){
  var p    = getProducts().find(function(x){ return x.id === id; });
  var pack = p && p.packQty ? p.packQty : 1;
  var qty  = window._cardQtys[id] || pack;
  addToCart(id, qty);
  window._cardQtys[id] = pack; // сброс
  // Обновить нижнюю часть карточки — покажет «В корзине»
  var ccr = document.getElementById('ccr-' + id);
  if(ccr) ccr.innerHTML = getCardCartHtml(id, pack);
}

// Устаревший quickAdd — для совместимости
function quickAdd(id, btn){
  var p   = getProducts().find(function(x){ return x.id === id; });
  var qty = p && p.packQty ? p.packQty : 1;
  addToCart(id, qty);
  var ccr = document.getElementById('ccr-' + id);
  if(ccr) ccr.innerHTML = getCardCartHtml(id, qty);
}

// ── Фильтр-панель ─────────────────────────────────────
function buildFilterPanel(){
  var cats  = getCats();
  var catEl = document.getElementById('fp-cats');
  if(!catEl) return;
  var html = '<button class="cat-btn active" data-cat="all" onclick="setCat(\'all\',\'\',this)">Все товары</button>';
  cats.forEach(function(c){
    html += '<button class="cat-btn" data-cat="' + c.id + '" onclick="setCat(\'' + c.id + '\',\'\',this)">' + c.emoji + ' ' + c.label + '</button>';
    if(c.sub && c.sub.length){
      c.sub.forEach(function(s){
        html += '<button class="cat-btn sub-btn" data-cat="' + c.id + '" data-sub="' + s.id + '" onclick="setCat(\'' + c.id + '\',\'' + s.id + '\',this)">└ ' + s.label + '</button>';
      });
    }
  });
  catEl.innerHTML = html;
}

function setCat(cat, subCat, el){
  catalogState.cat    = cat;
  catalogState.subCat = subCat || '';
  document.querySelectorAll('.cat-btn').forEach(function(b){ b.classList.remove('active'); });
  if(el) el.classList.add('active');
  renderCatalog();
}

function setSort(val){ catalogState.sort = val; renderCatalog(); }
function setSearch(val){ catalogState.search = val; renderCatalog(); }

function setPriceMin(val){
  var n = parseFloat(val);
  catalogState.priceMin = (val === '' || isNaN(n)) ? null : n;
  renderCatalog();
}
function setPriceMax(val){
  var n = parseFloat(val);
  catalogState.priceMax = (val === '' || isNaN(n)) ? null : n;
  renderCatalog();
}

function toggleBadge(cb){
  var b = cb.dataset.badge;
  if(cb.checked){
    if(catalogState.badges.indexOf(b) === -1) catalogState.badges.push(b);
  } else {
    catalogState.badges = catalogState.badges.filter(function(x){ return x !== b; });
  }
  renderCatalog();
}

function resetFilters(){
  catalogState = { cat:'all', subCat:'', sort:'default', search:'', priceMin:null, priceMax:null, badges:[] };
  var si = document.getElementById('sidebar-search'); if(si) si.value = '';
  var hi = document.getElementById('header-search');  if(hi) hi.value = '';
  var pm = document.getElementById('price-min');      if(pm) pm.value = '';
  var px = document.getElementById('price-max');      if(px) px.value = '';
  var ss = document.getElementById('sort-select');    if(ss) ss.value = 'default';
  document.querySelectorAll('.fp-badges input[type=checkbox]').forEach(function(c){ c.checked = false; });
  document.querySelectorAll('.cat-btn').forEach(function(b){ b.classList.remove('active'); });
  var all = document.querySelector('.cat-btn[data-cat="all"]');
  if(all) all.classList.add('active');
  renderCatalog();
}

window.addEventListener('storage', function(e){
  if(e.key === 'up_products' || e.key === 'up_cats'){ buildFilterPanel(); renderCatalog(); }
  if(e.key === 'up_cart'){ renderCatalog(); }
});
