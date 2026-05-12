// ============================================================
// ПАРОЛЬ АДМИНИСТРАТОРА — измените на свой!
// ============================================================
var ADMIN_PASSWORD = 'admin123';

// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================
var currentFilter = 'all';
var currentTab = 'orders';

function doLogin(){
  var val = document.getElementById('pw-input').value;
  if(val === ADMIN_PASSWORD){
    sessionStorage.setItem('upakovka_admin','1');
    document.getElementById('login-screen').style.display='none';
    document.getElementById('admin-panel').style.display='block';
    initPanel();
  } else {
    document.getElementById('pw-input').classList.add('error');
    document.getElementById('pw-err').classList.add('show');
    document.getElementById('pw-input').value='';
    setTimeout(function(){
      document.getElementById('pw-input').classList.remove('error');
      document.getElementById('pw-err').classList.remove('show');
    }, 2000);
  }
}

function adminLogout(){
  sessionStorage.removeItem('upakovka_admin');
  location.reload();
}

function initPanel(){
  startClock();
  renderOrders();
  renderProductsAdmin();
  setInterval(function(){ if(currentTab==='orders') renderOrders(); }, 15000);
}

// Автовход если уже авторизован
if(sessionStorage.getItem('upakovka_admin')==='1'){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('admin-panel').style.display='block';
  initPanel();
}

// ============================================================
// ЧАСЫ
// ============================================================
function startClock(){
  function tick(){
    var el = document.getElementById('clock');
    if(el) el.textContent = new Date().toLocaleTimeString('ru-RU');
  }
  tick(); setInterval(tick,1000);
}

// ============================================================
// ТАБЫ
// ============================================================
function showTab(name, btn){
  currentTab = name;
  document.querySelectorAll('.atab').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('tab-orders').style.display   = name==='orders'   ? 'block' : 'none';
  document.getElementById('tab-products').style.display = name==='products' ? 'block' : 'none';
  if(name==='products') renderProductsAdmin();
}

// ============================================================
// ЗАКАЗЫ
// ============================================================
function getOrders(){
  try{ return JSON.parse(localStorage.getItem('upakovka_orders')||'[]'); }
  catch(e){ return []; }
}
function saveOrders(list){ localStorage.setItem('upakovka_orders', JSON.stringify(list)); }

var statusLabel = {new:'Новый', processing:'В обработке', done:'Выполнен'};
var statusCls   = {new:'status-new', processing:'status-processing', done:'status-done'};

function renderOrders(){
  var all = getOrders();
  var list = currentFilter==='all' ? all : all.filter(function(o){ return o.status===currentFilter; });

  // Статистика
  var newCount  = all.filter(function(o){ return o.status==='new'; }).length;
  var procCount = all.filter(function(o){ return o.status==='processing'; }).length;
  var doneCount = all.filter(function(o){ return o.status==='done'; }).length;

  var statsEl = document.getElementById('order-stats');
  if(statsEl) statsEl.innerHTML =
    '<div class="astat"><div class="astat-l">Всего</div><div class="astat-v">'+all.length+'</div></div>'+
    '<div class="astat"><div class="astat-l">Новых</div><div class="astat-v red">'+newCount+'</div></div>'+
    '<div class="astat"><div class="astat-l">В обработке</div><div class="astat-v">'+procCount+'</div></div>'+
    '<div class="astat"><div class="astat-l">Выполнено</div><div class="astat-v green">'+doneCount+'</div></div>';

  var badge = document.getElementById('new-badge');
  if(badge) badge.textContent = newCount;

  var el = document.getElementById('orders-list');
  var noEl = document.getElementById('no-orders');

  if(!list.length){
    el.innerHTML='';
    noEl.style.display='block';
    return;
  }
  noEl.style.display='none';

  el.innerHTML = list.map(function(o){
    return '<div class="order-card '+(o.status==='new'?'order-new':'')+'">'+
      '<div class="order-top">'+
        '<div style="display:flex;align-items:center;gap:12px">'+
          '<span class="order-id">'+o.id+'</span>'+
          '<span class="order-time">'+o.time+'</span>'+
        '</div>'+
        '<span class="order-status '+statusCls[o.status]+'">'+statusLabel[o.status]+'</span>'+
      '</div>'+
      '<div class="order-phone">📞 '+o.phone+(o.name && o.name!=='Покупатель' ? ' · <span style="font-weight:400;color:#666;font-size:14px">'+o.name+'</span>':'')+' </div>'+
      '<div class="order-pills">'+
        '<span class="pill">🚚 '+o.delivery+'</span>'+
        '<span class="pill">💳 '+o.payment+'</span>'+
        (o.address ? '<span class="pill">📍 '+o.address+'</span>' : '')+
      '</div>'+
      '<div class="order-items-row">'+
        o.items.map(function(i){ return '<span class="order-item-tag">'+i.emoji+' '+i.name+' — <b>'+i.qty+' шт.</b></span>'; }).join('')+
      '</div>'+
      (o.comment ? '<div class="order-comment">💬 '+o.comment+'</div>' : '')+
      '<div class="order-footer">'+
        '<div class="order-total">'+o.total+' ₽</div>'+
        '<div class="order-actions">'+
          '<a class="abtn" href="tel:'+o.phone.replace(/\D/g,'')+'">📞 Позвонить</a>'+
          (o.status==='new' ? '<button class="abtn abtn-confirm" onclick="setOrderStatus(\''+o.id+'\',\'processing\')">✓ Принять</button>' : '')+
          (o.status==='processing' ? '<button class="abtn abtn-confirm" onclick="setOrderStatus(\''+o.id+'\',\'done\')">📦 Выполнен</button>' : '')+
          (o.status==='done' ? '<span style="color:#2e7b4f;font-size:13px">✓ Завершён</span>' : '')+
          '<button class="abtn abtn-del" onclick="deleteOrder(\''+o.id+'\')">🗑</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function setOrderStatus(id, status){
  var orders = getOrders();
  var o = orders.find(function(x){ return x.id===id; });
  if(o){ o.status=status; saveOrders(orders); renderOrders(); }
}

function deleteOrder(id){
  if(!confirm('Удалить заказ '+id+'?')) return;
  saveOrders(getOrders().filter(function(o){ return o.id!==id; }));
  renderOrders();
}

function clearAllOrders(){
  if(!confirm('Удалить ВСЕ заказы? Это нельзя отменить.')) return;
  saveOrders([]);
  renderOrders();
}

function filterOrders(filter, btn){
  currentFilter = filter;
  document.querySelectorAll('.flt-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderOrders();
}

// ============================================================
// ТОВАРЫ — CRUD
// ============================================================
function renderProductsAdmin(){
  var el = document.getElementById('products-admin-list');
  if(!el) return;
  var list = getProducts();

  var badgeLabel = {hit:'Хит',new:'Новинка',eco:'Эко',sale:'Скидка'};

  el.innerHTML = '<table class="products-table">'+
    '<thead><tr><th></th><th>Название</th><th>Цена</th><th>Категория</th><th>Значок</th><th>Действия</th></tr></thead>'+
    '<tbody>'+
    list.map(function(p){
      return '<tr>'+
        '<td class="td-emoji">'+p.emoji+'</td>'+
        '<td><div class="p-name">'+p.name+'</div><div class="p-meta">'+p.meta+'</div></td>'+
        '<td class="td-price">'+p.price.toFixed(2)+' ₽'+(p.oldPrice?'<br><span class="old-price">'+p.oldPrice.toFixed(2)+' ₽</span>':'')+' </td>'+
        '<td class="td-cat">'+catLabel(p.cat)+'</td>'+
        '<td>'+(p.badge?'<span class="pbadge '+badgeCls(p.badge)+'">'+badgeLabel[p.badge]+'</span>':'—')+'</td>'+
        '<td class="td-actions">'+
          '<button class="abtn" onclick="openProductModal('+p.id+')">✏️ Ред.</button>'+
          '<button class="abtn abtn-del" onclick="deleteProduct('+p.id+')">🗑</button>'+
        '</td>'+
      '</tr>';
    }).join('')+
    '</tbody></table>';
}

function catLabel(c){ return {containers:'📦 Контейнеры',cups:'☕ Стаканы',bags:'🛍️ Пакеты',plates:'🍽️ Тарелки'}[c]||c; }
function badgeCls(b){ return {hit:'badge-hit',new:'badge-new',eco:'badge-eco',sale:'badge-sale'}[b]||''; }

function openProductModal(id){
  var modal = document.getElementById('product-modal');
  var overlay = document.getElementById('modal-overlay');
  modal.style.display='block';
  overlay.style.display='block';

  if(id){
    var p = getProducts().find(function(x){ return x.id===id; });
    if(!p) return;
    document.getElementById('modal-title').textContent = 'Редактировать товар';
    document.getElementById('m-id').value = p.id;
    document.getElementById('m-emoji').value = p.emoji;
    document.getElementById('m-name').value = p.name;
    document.getElementById('m-meta').value = p.meta;
    document.getElementById('m-price').value = p.price;
    document.getElementById('m-old-price').value = p.oldPrice||'';
    document.getElementById('m-cat').value = p.cat;
    document.getElementById('m-badge').value = p.badge||'';
    document.getElementById('m-material').value = p.material||'';
    document.getElementById('m-volume').value = p.volume||'';
    document.getElementById('m-size').value = p.size||'';
  } else {
    document.getElementById('modal-title').textContent = 'Добавить товар';
    document.getElementById('m-id').value = '';
    ['m-emoji','m-name','m-meta','m-price','m-old-price','m-material','m-volume','m-size'].forEach(function(f){
      document.getElementById(f).value='';
    });
    document.getElementById('m-cat').value='containers';
    document.getElementById('m-badge').value='';
  }
}

function closeModal(){
  document.getElementById('product-modal').style.display='none';
  document.getElementById('modal-overlay').style.display='none';
}

function saveProduct(){
  var name = document.getElementById('m-name').value.trim();
  var priceStr = document.getElementById('m-price').value;
  if(!name){ alert('Введите название товара'); return; }
  if(!priceStr){ alert('Введите цену'); return; }

  var price = parseFloat(priceStr);
  var oldPriceStr = document.getElementById('m-old-price').value;
  var oldPrice = oldPriceStr ? parseFloat(oldPriceStr) : null;

  var products = getProducts();
  var editId = document.getElementById('m-id').value;

  var product = {
    id:       editId ? parseInt(editId) : nextProductId(),
    emoji:    document.getElementById('m-emoji').value||'📦',
    name:     name,
    meta:     document.getElementById('m-meta').value.trim(),
    price:    price,
    oldPrice: oldPrice,
    cat:      document.getElementById('m-cat').value,
    badge:    document.getElementById('m-badge').value||null,
    material: document.getElementById('m-material').value.trim()||'—',
    volume:   document.getElementById('m-volume').value.trim()||'—',
    size:     document.getElementById('m-size').value.trim()||'—',
  };

  if(editId){
    var idx = products.findIndex(function(p){ return p.id===parseInt(editId); });
    if(idx>=0) products[idx]=product;
  } else {
    products.push(product);
  }

  saveProducts(products);
  closeModal();
  renderProductsAdmin();

  // Показываем уведомление
  var msg = document.createElement('div');
  msg.className='save-toast';
  msg.textContent = editId ? '✓ Товар сохранён' : '✓ Товар добавлен';
  document.body.appendChild(msg);
  setTimeout(function(){ msg.classList.add('show'); }, 10);
  setTimeout(function(){ msg.classList.remove('show'); setTimeout(function(){ msg.remove(); },300); }, 2000);
}

function deleteProduct(id){
  var p = getProducts().find(function(x){ return x.id===id; });
  if(!p) return;
  if(!confirm('Удалить товар "'+p.name+'"?')) return;
  saveProducts(getProducts().filter(function(x){ return x.id!==id; }));
  renderProductsAdmin();
}
