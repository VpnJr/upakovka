var catalogState={cat:'all',sort:'default',search:'',priceMin:'',priceMax:''};

var BADGE_LABEL={hit:'Хит продаж',new:'Новинка',eco:'Эко',sale:'Скидка'};
var BADGE_CLS={hit:'badge-hit',new:'badge-new',eco:'badge-eco',sale:'badge-sale'};
var CAT_LABEL={all:'Все товары',containers:'Контейнеры',cups:'Стаканы',bags:'Пакеты',plates:'Тарелки'};

function renderCatalog(){
  var grid=document.getElementById('products-grid');
  if(!grid) return;

  var list=getProducts();

  // Фильтр категории
  if(catalogState.cat!=='all') list=list.filter(function(p){return p.cat===catalogState.cat;});

  // Поиск
  if(catalogState.search){
    var q=catalogState.search.toLowerCase();
    list=list.filter(function(p){return p.name.toLowerCase().includes(q)||p.meta.toLowerCase().includes(q);});
  }

  // Цена
  if(catalogState.priceMin!=='') list=list.filter(function(p){return p.price>=parseFloat(catalogState.priceMin);});
  if(catalogState.priceMax!=='') list=list.filter(function(p){return p.price<=parseFloat(catalogState.priceMax);});

  // Сортировка
  list=list.slice();
  if(catalogState.sort==='price_asc') list.sort(function(a,b){return a.price-b.price;});
  else if(catalogState.sort==='price_desc') list.sort(function(a,b){return b.price-a.price;});
  else if(catalogState.sort==='name') list.sort(function(a,b){return a.name.localeCompare(b.name,'ru');});

  // Счётчик
  var countEl=document.getElementById('catalog-count');
  if(countEl) countEl.textContent=list.length+' '+(list.length===1?'товар':list.length<5?'товара':'товаров');

  if(!list.length){
    grid.innerHTML='<div class="catalog-empty"><div style="font-size:48px;margin-bottom:12px">🔍</div><p>Ничего не найдено</p><button class="btn-outline" onclick="resetFilters()">Сбросить фильтры</button></div>';
    return;
  }

  grid.innerHTML=list.map(function(p){
    var img=p.photo
      ?'<img src="'+p.photo+'" alt="'+p.name+'" loading="lazy">'
      :'<div class="card-emoji">'+p.emoji+'</div>';
    return '<div class="product-card" onclick="location.href=\'product.html?id='+p.id+'\'">'+
      '<div class="product-img">'+img+
        (p.badge?'<span class="product-badge '+BADGE_CLS[p.badge]+'">'+BADGE_LABEL[p.badge]+'</span>':'')+
        (p.oldPrice?'<span class="product-discount">-'+Math.round((1-p.price/p.oldPrice)*100)+'%</span>':'')+
      '</div>'+
      '<div class="product-info">'+
        '<div class="product-name">'+p.name+'</div>'+
        '<div class="product-meta">'+p.meta+'</div>'+
        '<div class="product-price-row">'+
          '<div class="product-price">'+p.price.toFixed(2)+' ₽</div>'+
          (p.oldPrice?'<div class="product-old">'+p.oldPrice.toFixed(2)+' ₽</div>':'')+
        '</div>'+
        '<button class="add-cart-btn" onclick="event.stopPropagation();quickAdd('+p.id+',this)">+ В корзину</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

function quickAdd(id,btn){
  addToCart(id,50);
  btn.textContent='✓ Добавлено';
  btn.classList.add('added');
  setTimeout(function(){btn.textContent='+ В корзину';btn.classList.remove('added');},1600);
}

function setCat(cat,el){
  catalogState.cat=cat;
  document.querySelectorAll('.cat-btn').forEach(function(b){b.classList.remove('active');});
  if(el) el.classList.add('active');
  renderCatalog();
}

function setSort(val){
  catalogState.sort=val;
  renderCatalog();
}

function setSearch(val){
  catalogState.search=val;
  renderCatalog();
}

function setPriceMin(val){ catalogState.priceMin=val; renderCatalog(); }
function setPriceMax(val){ catalogState.priceMax=val; renderCatalog(); }

function resetFilters(){
  catalogState={cat:'all',sort:'default',search:'',priceMin:'',priceMax:''};
  var si=document.getElementById('search-input');
  if(si) si.value='';
  var pm=document.getElementById('price-min');if(pm) pm.value='';
  var px=document.getElementById('price-max');if(px) px.value='';
  var ss=document.getElementById('sort-select');if(ss) ss.value='default';
  document.querySelectorAll('.cat-btn').forEach(function(b){b.classList.remove('active');});
  var all=document.querySelector('.cat-btn[data-cat="all"]');
  if(all) all.classList.add('active');
  renderCatalog();
}

window.addEventListener('storage',function(e){if(e.key==='up_products') renderCatalog();});
