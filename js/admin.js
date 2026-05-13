// ══════════════════════════════════════════════════════
//  ПАРОЛЬ — смените перед публикацией!
// ══════════════════════════════════════════════════════
var ADMIN_PASSWORD = 'admin123';

var adminState = {
  tab: 'stats',
  ordersFilter: 'all',
  ordersSearch: '',
  productsSearch: '',
  productsCat: 'all',
  productsSort: 'default',
  editingProductId: null,
  pendingPhotoDataUrl: '',   // сжатый dataUrl, ждёт сохранения
  catEditing: null,           // {type:'cat'|'sub', catId, subId}
};

// ── AUTH ───────────────────────────────────────────────
function doLogin(){
  if(document.getElementById('pw-input').value === ADMIN_PASSWORD){
    sessionStorage.setItem('up_admin','1');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'flex';
    initAdmin();
  } else {
    var inp = document.getElementById('pw-input');
    inp.classList.add('shake'); inp.value='';
    document.getElementById('pw-err').style.display='block';
    setTimeout(function(){inp.classList.remove('shake');},600);
  }
}
function adminLogout(){
  sessionStorage.removeItem('up_admin');
  location.reload();
}
function showPanel(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('admin-app').style.display='flex';
  initAdmin();
}
if(sessionStorage.getItem('up_admin')==='1'){
  document.addEventListener('DOMContentLoaded', showPanel);
} else {
  document.addEventListener('DOMContentLoaded',function(){
    var inp=document.getElementById('pw-input');
    if(inp) inp.addEventListener('keydown',function(e){if(e.key==='Enter') doLogin();});
  });
}
function initAdmin(){
  startClock(); showTab('stats'); renderSidebarBadge();
  setInterval(function(){if(adminState.tab==='orders') renderOrders();},20000);
}
function startClock(){
  function tick(){var el=document.getElementById('admin-clock');if(el) el.textContent=new Date().toLocaleString('ru-RU',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
  tick(); setInterval(tick,10000);
}
function renderSidebarBadge(){
  var n=getOrders().filter(function(o){return o.status==='new';}).length;
  var b=document.getElementById('sidebar-new-count');
  if(b){b.textContent=n;b.style.display=n?'flex':'none';}
}

// ── TABS ───────────────────────────────────────────────
var FLEX_TABS={orders:true,products:true,categories:true};
function showTab(name){
  adminState.tab=name;
  document.querySelectorAll('.sidebar-item').forEach(function(b){b.classList.toggle('active',b.dataset.tab===name);});
  document.querySelectorAll('.tab-pane').forEach(function(p){p.style.display='none';});
  var pane=document.getElementById('tab-'+name);
  if(pane) pane.style.display=FLEX_TABS[name]?'flex':'block';
  if(name==='orders')     renderOrders();
  if(name==='products')   renderProductsAdmin();
  if(name==='categories') renderCategoriesAdmin();
  if(name==='stats')      renderStats();
}

// ════════════════════════════════════════════════════════
//  СТАТИСТИКА
// ════════════════════════════════════════════════════════
function renderStats(){
  var orders=getOrders(), prods=getProducts();
  var revenue=orders.filter(function(o){return o.status==='done';}).reduce(function(s,o){return s+parseFloat(o.total||0);},0);
  set('stat-orders',orders.length);
  set('stat-new-orders',orders.filter(function(o){return o.status==='new';}).length);
  set('stat-revenue',revenue.toFixed(0)+' ₽');
  set('stat-products',prods.length);
  var el=document.getElementById('recent-orders');
  if(el) el.innerHTML=orders.slice(0,5).map(function(o){
    return '<div class="recent-row"><span class="recent-id">#'+o.id+'</span><span class="recent-phone">'+o.phone+'</span><span class="recent-total">'+o.total+' ₽</span><span class="order-status '+SCLS[o.status]+'">'+SLBL[o.status]+'</span></div>';
  }).join('') || '<div class="empty-state-sm">Заказов пока нет</div>';
}

// ════════════════════════════════════════════════════════
//  ЗАКАЗЫ
// ════════════════════════════════════════════════════════
var SLBL = {new:'Новый', processing:'В обработке', done:'Выполнен'};
var SCLS = {new:'s-new', processing:'s-proc', done:'s-done'};

function renderOrders(){
  var all=getOrders(), list=all;
  if(adminState.ordersFilter!=='all') list=list.filter(function(o){return o.status===adminState.ordersFilter;});
  if(adminState.ordersSearch){
    var q=adminState.ordersSearch.toLowerCase();
    list=list.filter(function(o){return o.phone.includes(q)||(o.name||'').toLowerCase().includes(q)||o.id.toLowerCase().includes(q);});
  }
  var newC=all.filter(function(o){return o.status==='new';}).length;
  var procC=all.filter(function(o){return o.status==='processing';}).length;
  var doneC=all.filter(function(o){return o.status==='done';}).length;
  var rev=all.filter(function(o){return o.status==='done';}).reduce(function(s,o){return s+parseFloat(o.total||0);},0);
  set('os-total',all.length); set('os-new',newC); set('os-proc',procC); set('os-done',doneC); set('os-revenue',rev.toFixed(0)+' ₽');
  var b=document.getElementById('sidebar-new-count');
  if(b){b.textContent=newC;b.style.display=newC?'flex':'none';}
  var el=document.getElementById('orders-list');
  var empty=document.getElementById('orders-empty');
  if(!list.length){el.innerHTML='';if(empty)empty.style.display='flex';return;}
  if(empty) empty.style.display='none';
  el.innerHTML=list.map(function(o){
    return '<div class="order-card'+(o.status==='new'?' order-new':'')+'" id="oc-'+o.id+'">'+
      '<div class="oc-head"><div class="oc-head-left"><span class="oc-id">#'+o.id+'</span><span class="oc-time">'+o.time+'</span></div><span class="order-status '+SCLS[o.status]+'">'+SLBL[o.status]+'</span></div>'+
      '<div class="oc-body">'+
        '<div class="oc-phone"><div class="oc-phone-icon">📞</div><div><div class="oc-phone-num">'+o.phone+'</div>'+(o.name&&o.name!=='Покупатель'?'<div class="oc-phone-name">'+o.name+'</div>':'')+'</div></div>'+
        '<div class="oc-meta"><span class="oc-pill">🚚 '+o.delivery+'</span><span class="oc-pill">💳 '+o.payment+'</span>'+(o.address?'<span class="oc-pill">📍 '+o.address+'</span>':'')+'</div>'+
        '<div class="oc-items">'+o.items.map(function(i){return '<span class="order-tag">'+i.emoji+' '+i.name+' <b>'+i.qty+' шт.</b></span>';}).join('')+'</div>'+
        (o.comment?'<div class="oc-comment">💬 '+o.comment+'</div>':'')+
      '</div>'+
      '<div class="oc-footer"><div class="oc-total">'+o.total+' ₽</div><div class="oc-actions">'+
        '<a class="oc-btn" href="tel:'+o.phone.replace(/\D/g,'')+'">📞 Позвонить</a>'+
        (o.status==='new'?'<button class="oc-btn oc-btn-ok" onclick="setOrderStatus(\''+o.id+'\',\'processing\')">✓ Принять</button>':'')+
        (o.status==='processing'?'<button class="oc-btn oc-btn-ok" onclick="setOrderStatus(\''+o.id+'\',\'done\')">📦 Выполнен</button>':'')+
        (o.status==='done'?'<span class="oc-done-label">✓ Завершён</span>':'')+
        '<button class="oc-btn oc-btn-del" onclick="deleteOrder(\''+o.id+'\')">🗑</button>'+
      '</div></div>'+
    '</div>';
  }).join('');
}
function setOrderStatus(id,status){
  var orders=getOrders(), o=orders.find(function(x){return x.id===id;});
  if(o){o.status=status;saveOrders(orders);renderOrders();renderSidebarBadge();}
}
function deleteOrder(id){
  if(!confirm('Удалить заказ #'+id+'?')) return;
  saveOrders(getOrders().filter(function(o){return o.id!==id;}));
  renderOrders(); renderSidebarBadge();
}
function clearAllOrders(){
  if(!confirm('Удалить ВСЕ заказы?')) return;
  saveOrders([]); renderOrders(); renderSidebarBadge();
}
function filterOrders(f,btn){
  adminState.ordersFilter=f;
  document.querySelectorAll('.orders-filter-btn').forEach(function(b){b.classList.remove('active');});
  if(btn) btn.classList.add('active');
  renderOrders();
}
function searchOrders(val){ adminState.ordersSearch=val; renderOrders(); }

// ════════════════════════════════════════════════════════
//  ТОВАРЫ
// ════════════════════════════════════════════════════════
var BADGELBL={hit:'🔥 Хит',new:'🆕 Новинка',eco:'🌿 Эко',sale:'💸 Скидка'};
var BADGECLS={hit:'badge-hit',new:'badge-new',eco:'badge-eco',sale:'badge-sale'};

function renderProductsAdmin(){
  var list=getProducts();
  if(adminState.productsCat!=='all') list=list.filter(function(p){return p.cat===adminState.productsCat;});
  if(adminState.productsSearch){
    var q=adminState.productsSearch.toLowerCase();
    list=list.filter(function(p){return p.name.toLowerCase().includes(q)||p.meta.toLowerCase().includes(q);});
  }
  list=list.slice();
  if(adminState.productsSort==='price_asc') list.sort(function(a,b){return a.price-b.price;});
  if(adminState.productsSort==='price_desc') list.sort(function(a,b){return b.price-a.price;});
  if(adminState.productsSort==='name') list.sort(function(a,b){return a.name.localeCompare(b.name,'ru');});
  set('prod-count', list.length+' товаров');
  var el=document.getElementById('products-admin-grid');
  var empty=document.getElementById('products-admin-empty');
  if(!list.length){if(el)el.innerHTML='';if(empty)empty.style.display='flex';return;}
  if(empty)empty.style.display='none';
  el.innerHTML=list.map(function(p){
    var photo=getPhoto(p.id);
    var imgHtml=photo?'<img src="'+photo+'" alt="'+p.name+'">'
      :'<div class="pa-card-emoji">'+p.emoji+'</div>';
    return '<div class="pa-card">'+
      '<div class="pa-card-img">'+imgHtml+(p.badge?'<span class="pa-badge '+BADGECLS[p.badge]+'">'+BADGELBL[p.badge]+'</span>':'')+'</div>'+
      '<div class="pa-card-body">'+
        '<div class="pa-card-name">'+p.name+'</div>'+
        '<div class="pa-card-meta">'+p.meta+'</div>'+
        '<div class="pa-card-cat">'+getCatLabel(p.cat, p.subCat)+'</div>'+
        (p.packQty?'<div class="pa-card-pack">В пачке: '+p.packQty+' шт.</div>':'')+
        '<div class="pa-card-price">'+p.price.toFixed(2)+' ₽'+(p.oldPrice?'<span class="pa-old">'+p.oldPrice.toFixed(2)+' ₽</span>':'')+'</div>'+
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
  if(btn)btn.classList.add('active');
  renderProductsAdmin();
}
function searchProducts(val){ adminState.productsSearch=val; renderProductsAdmin(); }
function sortProducts(val){ adminState.productsSort=val; renderProductsAdmin(); }

// ── Модалка товара ─────────────────────────────────────
function openProductModal(id){
  adminState.editingProductId = id || null;
  adminState.pendingPhotoDataUrl = '';
  var p = id ? getProducts().find(function(x){return x.id===id;}) : null;
  document.getElementById('modal-title').textContent = p ? 'Редактировать товар' : 'Новый товар';
  sf('m-emoji', p ? p.emoji : '📦');
  sf('m-name',  p ? p.name  : '');
  sf('m-meta',  p ? p.meta  : '');
  sf('m-price', p ? p.price : '');
  sf('m-oldprice', p && p.oldPrice ? p.oldPrice : '');
  sf('m-badge', p ? p.badge||'' : '');
  sf('m-material', p ? p.material||'' : '');
  sf('m-volume',   p ? p.volume||''   : '');
  sf('m-size',     p ? p.size||''     : '');
  sf('m-packqty',  p ? p.packQty||50  : 50);
  buildCatSelect(p ? p.cat : 'containers', p ? p.subCat||'' : '');

  // Фото
  var photo = id ? getPhoto(id) : '';
  var prev=document.getElementById('photo-preview');
  var noph=document.getElementById('no-photo');
  if(photo){ prev.src=photo; prev.style.display='block'; noph.style.display='none'; }
  else { prev.style.display='none'; noph.style.display='flex'; }
  document.getElementById('photo-input').value='';
  document.getElementById('modal-error').style.display='none';
  document.getElementById('product-modal').style.display='flex';
}

function buildCatSelect(selCat, selSub){
  var cats=getCats();
  // Категория
  var cs=document.getElementById('m-cat');
  cs.innerHTML=cats.map(function(c){
    return '<option value="'+c.id+'"'+(c.id===selCat?' selected':'')+'>'+c.emoji+' '+c.label+'</option>';
  }).join('');
  buildSubCatSelect(selCat, selSub);
  cs.onchange=function(){ buildSubCatSelect(this.value,''); };
}
function buildSubCatSelect(catId, selSub){
  var cats=getCats();
  var cat=cats.find(function(c){return c.id===catId;});
  var ss=document.getElementById('m-subcat');
  if(cat && cat.sub && cat.sub.length){
    ss.innerHTML='<option value="">— Подкатегория —</option>'+cat.sub.map(function(s){
      return '<option value="'+s.id+'"'+(s.id===selSub?' selected':'')+'>'+s.label+'</option>';
    }).join('');
    ss.style.display='block';
  } else {
    ss.innerHTML='<option value="">— нет подкатегорий —</option>';
    ss.style.display='block';
  }
}

function closeProductModal(){ document.getElementById('product-modal').style.display='none'; }

function handlePhotoUpload(input){
  var file=input.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ alert('Файл слишком большой. Максимум 5 МБ.'); return; }
  var reader=new FileReader();
  reader.onload=function(e){
    // Сжимаем сразу при выборе, показываем превью
    compressPhoto(e.target.result, function(compressed){
      adminState.pendingPhotoDataUrl = compressed;
      var prev=document.getElementById('photo-preview');
      var noph=document.getElementById('no-photo');
      prev.src=compressed; prev.style.display='block'; noph.style.display='none';
    });
  };
  reader.readAsDataURL(file);
}
function removePhotoBtn(){
  adminState.pendingPhotoDataUrl='__remove__';
  document.getElementById('photo-preview').style.display='none';
  document.getElementById('no-photo').style.display='flex';
  document.getElementById('photo-input').value='';
}

function saveProduct(){
  var name=gv('m-name').trim(), priceStr=gv('m-price');
  if(!name){ showModalErr('Введите название товара'); return; }
  if(!priceStr||isNaN(parseFloat(priceStr))){ showModalErr('Введите корректную цену'); return; }
  var products=getProducts();
  var editId=adminState.editingProductId;
  var product={
    id:       editId || nextId(),
    emoji:    gv('m-emoji')||'📦',
    name:     name,
    meta:     gv('m-meta').trim(),
    price:    parseFloat(priceStr),
    oldPrice: gv('m-oldprice') ? parseFloat(gv('m-oldprice')) : null,
    cat:      gv('m-cat'),
    subCat:   gv('m-subcat')||'',
    badge:    gv('m-badge')||null,
    material: gv('m-material').trim()||'—',
    volume:   gv('m-volume').trim()||'—',
    size:     gv('m-size').trim()||'—',
    packQty:  parseInt(gv('m-packqty'))||50,
  };
  if(editId){ var idx=products.findIndex(function(p){return p.id===editId;}); if(idx>=0)products[idx]=product; else products.push(product); }
  else { products.push(product); }
  saveProducts(products);

  // Сохранить фото
  if(adminState.pendingPhotoDataUrl==='__remove__'){
    deletePhoto(product.id);
    finishSave(editId);
  } else if(adminState.pendingPhotoDataUrl){
    // уже сжато в handlePhotoUpload
    try{
      localStorage.setItem('up_photo_'+product.id, adminState.pendingPhotoDataUrl);
      finishSave(editId);
    } catch(e){
      alert('Товар сохранён, но фото не влезло в хранилище. Попробуйте файл поменьше.');
      finishSave(editId);
    }
  } else {
    finishSave(editId);
  }
}
function finishSave(editId){
  closeProductModal();
  renderProductsAdmin();
  toast(editId ? 'Товар сохранён ✓' : 'Товар добавлен ✓', 'success');
}
function deleteProduct(id){
  var p=getProducts().find(function(x){return x.id===id;});
  if(!p||!confirm('Удалить "'+p.name+'"?')) return;
  saveProducts(getProducts().filter(function(x){return x.id!==id;}));
  deletePhoto(id);
  renderProductsAdmin();
  toast('Товар удалён','info');
}
function showModalErr(msg){
  var el=document.getElementById('modal-error');
  el.textContent=msg; el.style.display='block';
  setTimeout(function(){el.style.display='none';},3000);
}

// ════════════════════════════════════════════════════════
//  КАТЕГОРИИ — полный CRUD
// ════════════════════════════════════════════════════════
function renderCategoriesAdmin(){
  var cats=getCats();
  var el=document.getElementById('cats-list');
  if(!el) return;

  el.innerHTML=cats.map(function(c){
    var subsHtml=c.sub.map(function(s){
      return '<div class="cat-row sub-row">'+
        '<span class="cat-row-emoji" style="font-size:14px;opacity:.5">└</span>'+
        '<span class="cat-row-label">'+s.label+'</span>'+
        '<span class="cat-row-id">'+s.id+'</span>'+
        '<div class="cat-row-actions">'+
          '<button class="cabtn" onclick="openCatModal(\'sub\',\''+c.id+'\',\''+s.id+'\')">✏️</button>'+
          '<button class="cabtn cabtn-del" onclick="deleteSubCat(\''+c.id+'\',\''+s.id+'\')">🗑</button>'+
        '</div>'+
      '</div>';
    }).join('');
    return '<div class="cat-group">'+
      '<div class="cat-row main-row">'+
        '<span class="cat-row-emoji">'+c.emoji+'</span>'+
        '<span class="cat-row-label">'+c.label+'</span>'+
        '<span class="cat-row-id">'+c.id+'</span>'+
        '<div class="cat-row-actions">'+
          '<button class="cabtn cabtn-add" onclick="openCatModal(\'sub-new\',\''+c.id+'\',\'\')">+ подкатегория</button>'+
          '<button class="cabtn" onclick="openCatModal(\'cat\',\''+c.id+'\',\'\')">✏️</button>'+
          '<button class="cabtn cabtn-del" onclick="deleteCat(\''+c.id+'\')">🗑</button>'+
        '</div>'+
      '</div>'+
      subsHtml+
    '</div>';
  }).join('');
}

function openCatModal(type, catId, subId){
  adminState.catEditing = { type:type, catId:catId||'', subId:subId||'' };
  var cats = getCats();
  var cat  = cats.find(function(c){ return c.id === catId; });
  var sub  = cat ? cat.sub.find(function(s){ return s.id === subId; }) : null;

  var titles = { 'cat-new':'Новая категория', cat:'Редактировать категорию', 'sub-new':'Новая подкатегория', sub:'Редактировать подкатегорию' };
  document.getElementById('cat-modal-title').textContent = titles[type] || 'Категория';
  document.getElementById('cat-modal-error').style.display = 'none';

  var showEmoji  = (type === 'cat-new' || type === 'cat');
  var idDisabled = (type === 'cat' || type === 'sub'); // нельзя менять существующий ID

  document.getElementById('cm-emoji-row').style.display = showEmoji ? 'flex' : 'none';

  if(type === 'cat-new'){
    sf('cm-emoji', '📦'); sf('cm-label', ''); sf('cm-id', '');
    document.getElementById('cm-id-hint').textContent = 'Латиница, строчные, без пробелов. Пример: boxes';
  } else if(type === 'cat'){
    sf('cm-emoji', cat ? cat.emoji : '📦');
    sf('cm-label', cat ? cat.label : '');
    sf('cm-id',    cat ? cat.id    : '');
    document.getElementById('cm-id-hint').textContent = 'ID нельзя изменить — это нарушит привязку товаров';
  } else if(type === 'sub-new'){
    sf('cm-label', ''); sf('cm-id', '');
    document.getElementById('cm-id-hint').textContent = 'Пример: ' + (catId||'cat') + '_new';
  } else if(type === 'sub'){
    sf('cm-label', sub ? sub.label : '');
    sf('cm-id',    sub ? sub.id    : '');
    document.getElementById('cm-id-hint').textContent = 'ID нельзя изменить — это нарушит привязку товаров';
  }

  document.getElementById('cm-id').disabled = idDisabled;
  document.getElementById('cat-modal').style.display = 'flex';
}

function addMainCat(){
  openCatModal('cat-new', '', '');
}

function closeCatModal(){
  document.getElementById('cat-modal').style.display = 'none';
}

function saveCatModal(){
  var label = gv('cm-label').trim();
  var id    = gv('cm-id').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  var emoji = gv('cm-emoji') || '📦';
  var e     = adminState.catEditing;

  if(!label){ showCatErr('Введите название'); return; }

  var cats = getCats();

  if(e.type === 'cat-new'){
    if(!id){ showCatErr('Введите ID'); return; }
    var taken = [];
    cats.forEach(function(c){ taken.push(c.id); c.sub.forEach(function(s){ taken.push(s.id); }); });
    if(taken.indexOf(id) !== -1){ showCatErr('Такой ID уже существует'); return; }
    cats.push({ id:id, label:label, emoji:emoji, sub:[] });

  } else if(e.type === 'cat'){
    var cat = cats.find(function(c){ return c.id === e.catId; });
    if(cat){ cat.label = label; cat.emoji = emoji; }

  } else if(e.type === 'sub-new'){
    if(!id){ showCatErr('Введите ID'); return; }
    var taken2 = [];
    cats.forEach(function(c){ taken2.push(c.id); c.sub.forEach(function(s){ taken2.push(s.id); }); });
    if(taken2.indexOf(id) !== -1){ showCatErr('Такой ID уже существует'); return; }
    var parentCat = cats.find(function(c){ return c.id === e.catId; });
    if(parentCat) parentCat.sub.push({ id:id, label:label });

  } else if(e.type === 'sub'){
    var parentCat2 = cats.find(function(c){ return c.id === e.catId; });
    if(parentCat2){
      var s = parentCat2.sub.find(function(x){ return x.id === e.subId; });
      if(s) s.label = label;
    }
  }

  saveCats(cats);
  closeCatModal();
  renderCategoriesAdmin();
  toast('Сохранено ✓', 'success');
}

function deleteCat(catId){
  var prods = getProducts().filter(function(p){ return p.cat === catId; });
  var msg = prods.length
    ? 'В этой категории '+prods.length+' товаров. Они останутся без категории. Удалить?'
    : 'Удалить категорию?';
  if(!confirm(msg)) return;
  saveCats(getCats().filter(function(c){ return c.id !== catId; }));
  renderCategoriesAdmin();
  toast('Категория удалена', 'info');
}

function deleteSubCat(catId, subId){
  if(!confirm('Удалить подкатегорию?')) return;
  var cats = getCats();
  var cat  = cats.find(function(c){ return c.id === catId; });
  if(cat) cat.sub = cat.sub.filter(function(s){ return s.id !== subId; });
  saveCats(cats);
  renderCategoriesAdmin();
  toast('Подкатегория удалена', 'info');
}

function showCatErr(msg){
  var el = document.getElementById('cat-modal-error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(function(){ el.style.display = 'none'; }, 3000);
}

// ── УТИЛИТЫ ────────────────────────────────────────────
function set(id,val){ var el=document.getElementById(id); if(el) el.textContent=val; }
function sf(id,val){ var el=document.getElementById(id); if(el) el.value=val; }
function gv(id){ var el=document.getElementById(id); return el?el.value:''; }
function toast(msg,type){
  var t=document.createElement('div');
  t.className='admin-toast admin-toast-'+(type||'success');
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},300);},2500);
}
