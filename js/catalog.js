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
  // Счётчик показывает сколько добавить, НЕ сколько уже в корзине
  var addQty = window._cardQtys[productId] || pack;

  var ctrl =
    '<div class="card-qty-ctrl">' +
      '<button onclick="cardQty(' + productId + ',' + (-pack) + ')">−</button>' +
      '<span id="cq-' + productId + '">' + addQty + '</span>' +
      '<button onclick="cardQty(' + productId + ',' + pack + ')">+</button>' +
    '</div>';

  if(inCart){
    // Строка 1: зелёная надпись
    // Строка 2: счётчик [−][X][+]
    // Строка 3: кнопка "+ Ещё"
    return (
      '<span class="card-in-cart-lbl">✓ В корзине: <b>' + inCart.qty + ' шт.</b></span>' +
      ctrl +
      '<button class="add-cart-btn card-add-full card-add-more" id="ca-' + productId + '" onclick="cardAdd(' + productId + ')">+ Ещё</button>'
    );
  }
  // Обычный вид: счётчик [−][X][+], под ним кнопка "В корзину" на всю ширину
  return (
    ctrl +
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
  // Меняем ТОЛЬКО локальный счётчик — корзина не трогается
  var current = window._cardQtys[id] || pack;
  var next    = Math.max(pack, current + delta);
  window._cardQtys[id] = next;
  var el = document.getElementById('cq-' + id);
  if(el) el.textContent = next;
}

function cardAdd(id){
  var p    = getProducts().find(function(x){ return x.id === id; });
  var pack = p && p.packQty ? p.packQty : 1;
  var qty  = window._cardQtys[id] || pack;
  // Добавляем выбранное количество в корзину
  addToCart(id, qty);
  // Сбрасываем локальный счётчик на pack
  window._cardQtys[id] = pack;
  // Перерисовываем карточку — покажет актуальное «В корзине»
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
  var cats = getCats();
  var list = document.getElementById('cat-dd-list');
  if(!list) return;

  var items = [{ id:'all', emoji:'🏠', label:'Все категории' }].concat(cats);
  list.innerHTML = '';
  items.forEach(function(c){
    var div = document.createElement('div');
    div.className = 'cat-dd-item' + (c.id === (catalogState.cat||'all') ? ' active' : '');
    div.textContent = (c.emoji||'') + ' ' + c.label;
    div.dataset.id = c.id;
    div.onclick = function(){ onCatSelect(c.id); };
    list.appendChild(div);
  });

  var sel = items.find(function(c){ return c.id === (catalogState.cat||'all'); });
  var lbl = document.getElementById('cat-dd-label');
  if(lbl && sel){
    lbl.innerHTML = '';
    var span1 = document.createElement('span');
    span1.textContent = (sel.emoji||'') + ' ' + sel.label;
    var span2 = document.createElement('span');
    span2.className = 'cat-dd-arrow';
    span2.textContent = '▾';
    lbl.appendChild(span1);
    lbl.appendChild(span2);
  }

  buildSubList(catalogState.cat);
}


function buildSubList(catId){
  var cats = getCats();
  var wrap = document.getElementById('sub-list');
  if(!wrap) return;
  var cat = cats.find(function(c){ return c.id === catId; });
  if(cat && cat.sub && cat.sub.length){
    wrap.innerHTML = '';
    cat.sub.forEach(function(s){
      var btn = document.createElement('button');
      btn.className = 'sub-pill' + (s.id === catalogState.subCat ? ' active' : '');
      btn.textContent = s.label;
      btn.onclick = function(){ onSubSelect(s.id); };
      wrap.appendChild(btn);
    });
    wrap.style.display = 'block';
  } else {
    wrap.style.display = 'none';
  }
}


// Закрыть дропдаун при клике вне
document.addEventListener('click', function(e){
  var dd = document.getElementById('cat-dropdown');
  if(dd && !dd.contains(e.target)){
    var list = document.getElementById('cat-dd-list');
    if(list) list.style.display = 'none';
    var arrow = document.querySelector('.cat-dd-arrow');
    if(arrow) arrow.textContent = '▾';
  }
});

function toggleCatDD(){
  var list = document.getElementById('cat-dd-list');
  if(!list) return;
  var open = list.style.display !== 'none';
  list.style.display = open ? 'none' : 'block';
  var arrow = document.querySelector('.cat-dd-arrow');
  if(arrow) arrow.textContent = open ? '▾' : '▴';
}

function onCatSelect(val){
  catalogState.cat = val; catalogState.subCat = '';
  // Закрыть дропдаун
  var list = document.getElementById('cat-dd-list');
  if(list) list.style.display = 'none';
  var arrow = document.querySelector('.cat-dd-arrow');
  if(arrow) arrow.textContent = '▾';
  buildFilterPanel();
  renderCatalog();
}

function onSubSelect(val){
  catalogState.subCat = val;
  buildSubList(catalogState.cat);
  renderCatalog();
}

// Алиасы для совместимости
function buildSubSelect(catId){ buildSubList(catId); }


function setCat(cat, subCat){
  catalogState.cat    = cat;
  catalogState.subCat = subCat || '';
  var catSel = document.getElementById('cat-select');
  if(catSel) catSel.value = cat;
  buildSubSelect(cat);
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
  catalogState.cat = 'all'; catalogState.subCat = '';
  buildFilterPanel();
  renderCatalog();
}

window.addEventListener('storage', function(e){
  if(e.key === 'up_products' || e.key === 'up_cats'){ buildFilterPanel(); renderCatalog(); }
  if(e.key === 'up_cart'){ renderCatalog(); }
});
