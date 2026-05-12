// ══════════════════════════════════════════
//  ПАРОЛЬ — смените перед публикацией!
// ══════════════════════════════════════════
var ADMIN_PASSWORD = 'admin123';

// ── состояние ──────────────────────────────
var adminState = {
  tab: 'orders',
  ordersFilter: 'all',
  ordersSearch: '',
  productsSearch: '',
  productsCat: 'all',
  productsSort: 'default',
  editingProductId: null,
  photoDataUrl: ''
};

// ── авторизация ────────────────────────────
function doLogin(){
  var val = document.getElementById('pw-input').value;
  if(val === ADMIN_PASSWORD){
    sessionStorage.setItem('up_admin','1');
    showPanel();
  } else {
    var inp = document.getElementById('pw-input');
    var err = document.getElementById('pw-err');
    inp.classList.add('shake');
    err.style.display='block';
    inp.value='';
    setTimeout(function(){ inp.classList.remove('shake'); },600);
  }
}

function adminLogout(){
  sessionStorage.removeItem('up_admin');
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('admin-app').style.display='none';
}

function showPanel(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('admin-app').style.display='flex';
  initAdmin();
}

if(sessionStorage.getItem('up_admin')==='1'){
  document.addEventListener('DOMContentLoaded', showPanel);
} else {
  document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('pw-input').addEventListener('keydown',function(e){if(e.key==='Enter') doLogin();});
  });
}

// ── инит ───────────────────────────────────
function initAdmin(){
  startClock();
  renderSidebar();
  showTab('orders');
  setInterval(function(){ if(adminState.tab==='orders') renderOrders(); }, 20000);
}

function startClock(){
  function tick(){
    var el=document.getElementById('admin-clock');
    if(el) el.textContent=new Date().toLocaleString('ru-RU',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  tick(); setInterval(tick,10000);
}

// ── сайдбар ────────────────────────────────
function renderSidebar(){
  var orders=getOrders();
  var newCount=orders.filter(function(o){return o.status==='new';}).length;
  var el=document.getElementById('sidebar-new-count');
  if(el){ el.textContent=newCount; el.style.display=newCount?'flex':'none'; }
}

// ── табы ───────────────────────────────────
function showTab(name){
  adminState.tab=name;
  document.querySelectorAll('.sidebar-item').forEach(function(b){
    b.classList.toggle('active', b.dataset.tab===name);
  });
  document.querySelectorAll('.tab-pane').forEach(function(p){ p.style.display='none'; });
  var pane=document.getElementById('tab-'+name);
  if(pane) pane.style.display='flex';
  if(name==='orders') renderOrders();
  if(name==='products') renderProductsAdmin();
  if(name==='stats') renderStats();
}

// ════════════════════════════════════════════
//  ЗАКАЗЫ
// ════════════════════════════════════════════
var STATUS_LABEL={new:'Новый',processing:'В обработке',done:'Выполнен'};
var STATUS_CLS={new:'s-new',processing:'s-proc',done:'s-done'};

function renderOrders(){
  var all=getOrders();
  var list=all;
  if(adminState.ordersFilter!=='all') list=list.filter(function(o){return o.status===adminState.ordersFilter;});
  if(adminState.ordersSearch){
    var q=adminState.ordersSearch.toLowerCase();
    list=list.filter(function(o){
      return o.phone.includes(q)||(o.name||'').toLowerCase().includes(q)||o.id.toLowerCase().includes(q);
    });
  }

  // Статы
  var newC=all.filter(function(o){return o.status==='new';}).length;
  var procC=all.filter(function(o){return o.status==='processing';}).length;
  var doneC=all.filter(function(o){return o.status==='done';}).length;
  var revenue=all.filter(function(o){return o.status==='done';}).reduce(function(s,o){return s+parseFloat(o.total||0);},0);

  set('os-total',all.length);
  set('os-new',newC);
  set('os-proc',procC);
  set('os-done',doneC);
  set('os-revenue',revenue.toFixed(0)+' ₽');

  var badge=document.getElementById('sidebar-new-count');
  if(badge){ badge.textContent=newC; badge.style.display=newC?'flex':'none'; }

  var el=document.getElementById('orders-list');
  var empty=document.getElementById('orders-empty');
  if(!list.length){
    el.innerHTML='';
    if(empty) empty.style.display='flex';
    return;
  }
  if(empty) empty.style.display='none';

  el.innerHTML=list.map(function(o){
    var itemsHtml=o.items.map(function(i){
      return '<span class="order-tag">'+i.emoji+' '+i.name+' <b>'+i.qty+' шт.</b></span>';
    }).join('');

    return '<div class="order-card'+(o.status==='new'?' order-new':'')+'" id="oc-'+o.id+'">'+
      '<div class="oc-head">'+
        '<div class="oc-head-left">'+
          '<span class="oc-id">#'+o.id+'</span>'+
          '<span class="oc-time">'+o.time+'</span>'+
        '</div>'+
        '<span class="order-status '+STATUS_CLS[o.status]+'">'+STATUS_LABEL[o.status]+'</span>'+
      '</div>'+

      '<div class="oc-body">'+
        '<div class="oc-phone">'+
          '<div class="oc-phone-icon">📞</div>'+
          '<div>'+
            '<div class="oc-phone-num">'+o.phone+'</div>'+
            (o.name&&o.name!=='Покупатель'?'<div class="oc-phone-name">'+o.name+'</div>':'')+
          '</div>'+
        '</div>'+

        '<div class="oc-meta">'+
          '<span class="oc-pill">🚚 '+o.delivery+'</span>'+
          '<span class="oc-pill">💳 '+o.payment+'</span>'+
          (o.address?'<span class="oc-pill">📍 '+o.address+'</span>':'')+
        '</div>'+

        '<div class="oc-items">'+itemsHtml+'</div>'+
        (o.comment?'<div class="oc-comment"><span>💬</span> '+o.comment+'</div>':'')+
      '</div>'+

      '<div class="oc-footer">'+
        '<div class="oc-total">'+o.total+' ₽</div>'+
        '<div class="oc-actions">'+
          '<a class="oc-btn" href="tel:'+o.phone.replace(/\D/g,'')+'">📞 Позвонить</a>'+
          (o.status==='new'?'<button class="oc-btn oc-btn-ok" onclick="setOrderStatus(\''+o.id+'\',\'processing\')">✓ Принять</button>':'')+
          (o.status==='processing'?'<button class="oc-btn oc-btn-ok" onclick="setOrderStatus(\''+o.id+'\',\'done\')">📦 Выполнен</button>':'')+
          (o.status==='done'?'<span class="oc-done-label">✓ Завершён</span>':'')+
          '<button class="oc-btn oc-btn-del" onclick="deleteOrder(\''+o.id+'\')" title="Удалить">🗑</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function setOrderStatus(id,status){
  var orders=getOrders();
  var o=orders.find(function(x){return x.id===id;});
  if(o){ o.status=status; saveOrders(orders); renderOrders(); renderSidebar(); }
}

function deleteOrder(id){
  if(!confirm('Удалить заказ #'+id+'?')) return;
  saveOrders(getOrders().filter(function(o){return o.id!==id;}));
  renderOrders(); renderSidebar();
}

function clearAllOrders(){
  if(!confirm('Удалить ВСЕ заказы?')) return;
  saveOrders([]); renderOrders(); renderSidebar();
}

function filterOrders(f,btn){
  adminState.ordersFilter=f;
  document.querySelectorAll('.orders-filter-btn').forEach(function(b){b.classList.remove('active');});
  if(btn) btn.classList.add('active');
  renderOrders();
}

function searchOrders(val){
  adminState.ordersSearch=val;
  renderOrders();
}

// ════════════════════════════════════════════
//  ТОВАРЫ
// ════════════════════════════════════════════
var BADGE_L={hit:'🔥 Хит',new:'🆕 Новинка',eco:'🌿 Эко',sale:'💸 Скидка'};
var BADGE_C={hit:'badge-hit',new:'badge-new',eco:'badge-eco',sale:'badge-sale'};
var CAT_L={containers:'📦 Контейнеры',cups:'☕ Стаканы',bags:'🛍️ Пакеты',plates:'🍽️ Тарелки'};

function getFilteredProducts(){
  var list=getProducts();
  if(adminState.productsCat!=='all') list=list.filter(function(p){return p.cat===adminState.productsCat;});
  if(adminState.productsSearch){
    var q=adminState.productsSearch.toLowerCase();
    list=list.filter(function(p){return p.name.toLowerCase().includes(q)||p.meta.toLowerCase().includes(q);});
  }
  list=list.slice();
  if(adminState.productsSort==='price_asc') list.sort(function(a,b){return a.price-b.price;});
  else if(adminState.productsSort==='price_desc') list.sort(function(a,b){return b.price-a.price;});
  else if(adminState.productsSort==='name') list.sort(function(a,b){return a.name.localeCompare(b.name,'ru');});
  return list;
}

function renderProductsAdmin(){
  var list=getFilteredProducts();
  var el=document.getElementById('products-admin-grid');
  var empty=document.getElementById('products-admin-empty');
  var countEl=document.getElementById('prod-count');
  if(countEl) countEl.textContent=list.length+' товаров';

  if(!list.length){
    if(el) el.innerHTML='';
    if(empty) empty.style.display='flex';
    return;
  }
  if(empty) empty.style.display='none';

  el.innerHTML=list.map(function(p){
    var imgHtml=p.photo
      ?'<img src="'+p.photo+'" alt="'+p.name+'">'
      :'<div class="pa-card-emoji">'+p.emoji+'</div>';
    return '<div class="pa-card">'+
      '<div class="pa-card-img">'+imgHtml+
        (p.badge?'<span class="pa-badge '+BADGE_C[p.badge]+'">'+BADGE_L[p.badge]+'</span>':'')+
      '</div>'+
      '<div class="pa-card-body">'+
        '<div class="pa-card-name">'+p.name+'</div>'+
        '<div class="pa-card-meta">'+p.meta+'</div>'+
        '<div class="pa-card-cat">'+CAT_L[p.cat]+'</div>'+
        '<div class="pa-card-price">'+
          p.price.toFixed(2)+' ₽'+
          (p.oldPrice?'<span class="pa-old">'+p.oldPrice.toFixed(2)+' ₽</span>':'')+
        '</div>'+
      '</div>'+
      '<div class="pa-card-actions">'+
        '<button class="pa-btn pa-btn-edit" onclick="openProductModal('+p.id+')">✏️ Редактировать</button>'+
        '<button class="pa-btn pa-btn-del" onclick="deleteProduct('+p.id+')">🗑 Удалить</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

function filterProducts(cat,btn){
  adminState.productsCat=cat;
  document.querySelectorAll('.prod-filter-btn').forEach(function(b){b.classList.remove('active');});
  if(btn) btn.classList.add('active');
  renderProductsAdmin();
}

function searchProducts(val){
  adminState.productsSearch=val;
  renderProductsAdmin();
}

function sortProducts(val){
  adminState.productsSort=val;
  renderProductsAdmin();
}

// ── модалка товара ─────────────────────────
function openProductModal(id){
  adminState.editingProductId=id||null;
  adminState.photoDataUrl='';
  var modal=document.getElementById('product-modal');
  modal.style.display='flex';

  var p=id?getProducts().find(function(x){return x.id===id;}):null;
  document.getElementById('modal-title').textContent=p?'Редактировать товар':'Новый товар';

  setField('m-emoji',p?p.emoji:'📦');
  setField('m-name',p?p.name:'');
  setField('m-meta',p?p.meta:'');
  setField('m-price',p?p.price:'');
  setField('m-oldprice',p?p.oldPrice||'':'');
  setField('m-cat',p?p.cat:'containers');
  setField('m-badge',p?p.badge||'':'');
  setField('m-material',p?p.material||'':'');
  setField('m-volume',p?p.volume||'':'');
  setField('m-size',p?p.size||'':'');

  // Фото
  var preview=document.getElementById('photo-preview');
  var noPhoto=document.getElementById('no-photo');
  if(p&&p.photo){
    preview.src=p.photo;
    preview.style.display='block';
    noPhoto.style.display='none';
    adminState.photoDataUrl=p.photo;
  } else {
    preview.style.display='none';
    noPhoto.style.display='flex';
  }
  document.getElementById('photo-input').value='';
}

function closeProductModal(){
  document.getElementById('product-modal').style.display='none';
}

function handlePhotoUpload(input){
  var file=input.files[0];
  if(!file) return;
  if(file.size>2*1024*1024){ alert('Файл слишком большой. Максимум 2 МБ.'); return; }
  var reader=new FileReader();
  reader.onload=function(e){
    adminState.photoDataUrl=e.target.result;
    var preview=document.getElementById('photo-preview');
    var noPhoto=document.getElementById('no-photo');
    preview.src=e.target.result;
    preview.style.display='block';
    noPhoto.style.display='none';
  };
  reader.readAsDataURL(file);
}

function removePhoto(){
  adminState.photoDataUrl='__remove__';
  document.getElementById('photo-preview').style.display='none';
  document.getElementById('no-photo').style.display='flex';
  document.getElementById('photo-input').value='';
}

function saveProduct(){
  var name=document.getElementById('m-name').value.trim();
  var priceStr=document.getElementById('m-price').value;
  if(!name){ showModalError('Введите название товара'); return; }
  if(!priceStr||isNaN(parseFloat(priceStr))){ showModalError('Введите корректную цену'); return; }

  var oldPriceStr=document.getElementById('m-oldprice').value;
  var products=getProducts();
  var editId=adminState.editingProductId;

  // Фото
  var photo='';
  if(adminState.photoDataUrl==='__remove__') photo='';
  else if(adminState.photoDataUrl) photo=adminState.photoDataUrl;
  else if(editId){ var ep=products.find(function(x){return x.id===editId;}); photo=ep?ep.photo||'':''; }

  var product={
    id:      editId||nextId(),
    emoji:   document.getElementById('m-emoji').value||'📦',
    name:    name,
    meta:    document.getElementById('m-meta').value.trim(),
    price:   parseFloat(priceStr),
    oldPrice:oldPriceStr?parseFloat(oldPriceStr):null,
    cat:     document.getElementById('m-cat').value,
    badge:   document.getElementById('m-badge').value||null,
    photo:   photo,
    material:document.getElementById('m-material').value.trim()||'—',
    volume:  document.getElementById('m-volume').value.trim()||'—',
    size:    document.getElementById('m-size').value.trim()||'—',
  };

  if(editId){
    var idx=products.findIndex(function(p){return p.id===editId;});
    if(idx>=0) products[idx]=product; else products.push(product);
  } else {
    products.push(product);
  }

  saveProducts(products);
  closeProductModal();
  renderProductsAdmin();
  toast(editId?'Товар сохранён ✓':'Товар добавлен ✓','success');
}

function deleteProduct(id){
  var p=getProducts().find(function(x){return x.id===id;});
  if(!p) return;
  if(!confirm('Удалить "'+p.name+'"?')) return;
  saveProducts(getProducts().filter(function(x){return x.id!==id;}));
  renderProductsAdmin();
  toast('Товар удалён','info');
}

function showModalError(msg){
  var el=document.getElementById('modal-error');
  el.textContent=msg;
  el.style.display='block';
  setTimeout(function(){el.style.display='none';},3000);
}

// ── статистика ─────────────────────────────
function renderStats(){
  var orders=getOrders();
  var products=getProducts();
  var revenue=orders.filter(function(o){return o.status==='done';}).reduce(function(s,o){return s+parseFloat(o.total||0);},0);

  set('stat-orders',orders.length);
  set('stat-revenue',revenue.toFixed(0)+' ₽');
  set('stat-products',products.length);
  set('stat-new-orders',orders.filter(function(o){return o.status==='new';}).length);

  // Последние заказы
  var recent=orders.slice(0,5);
  var el=document.getElementById('recent-orders');
  if(el) el.innerHTML=recent.length?recent.map(function(o){
    return '<div class="recent-row">'+
      '<span class="recent-id">#'+o.id+'</span>'+
      '<span class="recent-phone">'+o.phone+'</span>'+
      '<span class="recent-total">'+o.total+' ₽</span>'+
      '<span class="order-status '+STATUS_CLS[o.status]+'">'+STATUS_LABEL[o.status]+'</span>'+
    '</div>';
  }).join(''):'<div class="empty-state-sm">Заказов пока нет</div>';
}

// ── утилиты ────────────────────────────────
function set(id,val){ var el=document.getElementById(id); if(el) el.textContent=val; }
function setField(id,val){ var el=document.getElementById(id); if(el) el.value=val; }

function toast(msg,type){
  var t=document.createElement('div');
  t.className='admin-toast admin-toast-'+( type||'success');
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},300);},2500);
}
