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

  // Фильтр цены — только если введено число > 0
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
      ? '<img src="'+photo+'" alt="'+p.name+'" loading="lazy">'
      : '<div class="card-emoji">'+p.emoji+'</div>';
    var pack = p.packQty || 1;
    var packInfo = pack > 1 ? '<div class="product-pack">В пачке: <b>'+pack+' шт.</b></div>' : '';
    return '<div class="product-card" onclick="location.href='product.html?id='+p.id+''">'+
      '<div class="product-img">'+img+
        (p.badge ? '<span class="product-badge '+BADGE_CLS[p.badge]+'">'+BADGE_LABEL[p.badge]+'</span>' : '')+
        (p.oldPrice ? '<span class="product-discount">−'+Math.round((1-p.price/p.oldPrice)*100)+'%</span>' : '')+
      '</div>'+
      '<div class="product-info">'+
        '<div class="product-name">'+p.name+'</div>'+
        '<div class="product-meta">'+p.meta+'</div>'+
        packInfo+
        '<div class="product-price-row">'+
          '<div class="product-price">'+p.price.toFixed(2)+' ₽</div>'+
          (p.oldPrice ? '<div class="product-old">'+p.oldPrice.toFixed(2)+' ₽</div>' : '')+
        '</div>'+
        '<div class="card-cart-row" onclick="event.stopPropagation()">'+
          '<div class="card-qty-ctrl">'+
            '<button onclick="cardQty('+p.id+',-'+pack+')">−</button>'+
            '<span id="cq-'+p.id+'">'+pack+'</span>'+
            '<button onclick="cardQty('+p.id+','+pack+')">+</button>'+
          '</div>'+
          '<button class="add-cart-btn card-add-btn" id="ca-'+p.id+'" onclick="cardAdd('+p.id+')">В корзину</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

// Глобальное хранилище выбранных количеств на карточках
window._cardQtys = {};

function cardQty(id, delta){
  var p = getProducts().find(function(x){ return x.id===id; });
  var pack = (p && p.packQty) ? p.packQty : 1;
  var current = window._cardQtys[id] || pack;
  var next = Math.max(pack, current + delta);
  window._cardQtys[id] = next;
  var el = document.getElementById('cq-'+id);
  if(el) el.textContent = next;
}

function cardAdd(id){
  var p = getProducts().find(function(x){ return x.id===id; });
  var pack = (p && p.packQty) ? p.packQty : 1;
  var qty = window._cardQtys[id] || pack;
  addToCart(id, qty);
  // Сбросить счётчик обратно на pack
  window._cardQtys[id] = pack;
  var el = document.getElementById('cq-'+id);
  if(el) el.textContent = pack;
  // Анимация кнопки
  var btn = document.getElementById('ca-'+id);
  if(btn){
    btn.textContent = '✓ Добавлено';
    btn.classList.add('added');
    setTimeout(function(){ btn.textContent = 'В корзину'; btn.classList.remove('added'); }, 1600);
  }
}

// Устаревший quickAdd — оставлен для совместимости
function quickAdd(id, btn){
  var p = getProducts().find(function(x){ return x.id===id; });
  var qty = (p && p.packQty) ? p.packQty : 1;
  addToCart(id, qty);
  if(btn){ btn.textContent='✓ Добавлено'; btn.classList.add('added'); setTimeout(function(){btn.textContent='+ В корзину';btn.classList.remove('added');},1600); }
}

// ── Фильтр-панель ─────────────────────────────────────────
function buildFilterPanel(){
  var cats = getCats();
  var catEl = document.getElementById('fp-cats');
  if(!catEl) return;
  var html = '<button class="cat-btn active" data-cat="all" onclick="setCat(\'all\',\'\',this)">Все товары</button>';
  cats.forEach(function(c){
    html += '<button class="cat-btn" data-cat="'+c.id+'" onclick="setCat(\''+c.id+'\',\'\',this)">'+c.emoji+' '+c.label+'</button>';
    if(c.sub && c.sub.length){
      c.sub.forEach(function(s){
        html += '<button class="cat-btn sub-btn" data-cat="'+c.id+'" data-sub="'+s.id+'" onclick="setCat(\''+c.id+'\',\''+s.id+'\',this)">└ '+s.label+'</button>';
      });
    }
  });
  catEl.innerHTML = html;
}

function setCat(cat, subCat, el){
  catalogState.cat = cat;
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
});

// Вызывается из index.html после загрузки свежих данных с сервера
// function loadProductsFromServer определена в data.js
