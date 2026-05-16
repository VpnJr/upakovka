// ═══════════════════════════════════════════════════════════
//  FIREBASE CONFIG
// ═══════════════════════════════════════════════════════════
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC5WmllONH_dKc8z8kF-WXwbQ7nl1i42VM",
  authDomain:        "upakovka09-c97d1.firebaseapp.com",
  projectId:         "upakovka09-c97d1",
  storageBucket:     "upakovka09-c97d1.firebasestorage.app",
  messagingSenderId: "402891810707",
  appId:             "1:402891810707:web:0980f659518bf4394f6a66"
};

var IMGBB_KEY = '605aad32ee4f662d7c61875d4e055c66';

// Базовые URL
var FS       = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_CONFIG.projectId + '/databases/(default)/documents';
var FS_QUERY = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_CONFIG.projectId + '/databases/(default)/documents:runQuery';

// ── Токен для запросов ──────────────────────────────────────
// Для админки — _adminToken (устанавливается при входе через Firebase Auth)
// Для покупателей — берётся из sessionStorage (getCurrentUser().token)
function _getToken(){
  if(typeof _adminToken !== 'undefined' && _adminToken) return _adminToken;
  try{
    var u = JSON.parse(sessionStorage.getItem('up_user') || 'null');
    return (u && u.token) ? u.token : null;
  }catch(e){ return null; }
}

function _h(extra){
  var h = Object.assign({'Content-Type':'application/json'}, extra||{});
  var tok = _getToken();
  if(tok) h['Authorization'] = 'Bearer ' + tok;
  return h;
}

// ── Firestore CRUD ──────────────────────────────────────────
function fsGet(path, cb){
  fetch(FS+'/'+path, {headers:_h()})
    .then(function(r){return r.json();})
    .then(function(d){ cb(d.error?null:d, d.error||null); })
    .catch(function(e){ cb(null, e); });
}

function fsPatch(path, fields, cb){
  var mask = Object.keys(fields).map(function(k){ return 'updateMask.fieldPaths='+k; }).join('&');
  fetch(FS+'/'+path+'?'+mask, {method:'PATCH', headers:_h(), body:JSON.stringify({fields:fields})})
    .then(function(r){return r.json();})
    .then(function(d){ if(cb) cb(d.error?null:d, d.error||null); })
    .catch(function(e){ if(cb) cb(null,e); });
}

function fsSet(path, fields, cb){
  // Полная запись документа (не PATCH)
  fetch(FS+'/'+path, {method:'PATCH', headers:_h(), body:JSON.stringify({fields:fields})})
    .then(function(r){return r.json();})
    .then(function(d){ if(cb) cb(d.error?null:d, d.error||null); })
    .catch(function(e){ if(cb) cb(null,e); });
}

function fsDelete(path, cb){
  fetch(FS+'/'+path, {method:'DELETE', headers:_h()})
    .then(function(){ if(cb) cb(null); })
    .catch(function(e){ if(cb) cb(e); });
}

function fsList(path, cb){
  fetch(FS+'/'+path, {headers:_h()})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.error){ cb([], d.error); return; }
      cb(d.documents || [], null);
    })
    .catch(function(e){ cb([], e); });
}

// ── Конвертация Firestore ↔ JS ──────────────────────────────
function fsVal(v){
  if(!v) return null;
  if(v.stringValue  !== undefined) return v.stringValue;
  if(v.integerValue !== undefined) return parseInt(v.integerValue);
  if(v.doubleValue  !== undefined) return parseFloat(v.doubleValue);
  if(v.booleanValue !== undefined) return v.booleanValue;
  if(v.nullValue    !== undefined) return null;
  if(v.arrayValue)  return (v.arrayValue.values||[]).map(fsVal);
  if(v.mapValue){
    var obj={}, f=v.mapValue.fields||{};
    Object.keys(f).forEach(function(k){obj[k]=fsVal(f[k]);});
    return obj;
  }
  return null;
}

function toFsVal(v){
  if(v===null||v===undefined) return {nullValue:null};
  if(typeof v==='boolean')    return {booleanValue:v};
  if(typeof v==='number')     return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
  if(typeof v==='string')     return {stringValue:v};
  if(Array.isArray(v))        return {arrayValue:{values:v.map(toFsVal)}};
  if(typeof v==='object'){
    var fields={};
    Object.keys(v).forEach(function(k){fields[k]=toFsVal(v[k]);});
    return {mapValue:{fields:fields}};
  }
  return {stringValue:String(v)};
}

function docToObj(doc){
  if(!doc||!doc.fields) return null;
  var obj={_id:(doc.name||'').split('/').pop()};
  Object.keys(doc.fields).forEach(function(k){obj[k]=fsVal(doc.fields[k]);});
  return obj;
}

function objToFields(obj){
  var fields={};
  Object.keys(obj).forEach(function(k){ if(k!=='_id') fields[k]=toFsVal(obj[k]); });
  return fields;
}

// ═══════════════════════════════════════════════════════════
//  КАТЕГОРИИ — localStorage + Firebase
// ═══════════════════════════════════════════════════════════
var DEFAULT_CATS=[
  {id:'containers',label:'Контейнеры',emoji:'📦',sub:[
    {id:'containers_plastic',label:'Пластиковые'},
    {id:'containers_paper',label:'Бумажные / крафт'},
    {id:'containers_foil',label:'Фольга'},
  ]},
  {id:'cups',label:'Стаканы',emoji:'☕',sub:[
    {id:'cups_paper',label:'Бумажные'},
    {id:'cups_plastic',label:'Пластиковые'},
  ]},
  {id:'bags',label:'Пакеты',emoji:'🛍️',sub:[
    {id:'bags_kraft',label:'Крафт'},
    {id:'bags_plastic',label:'Полиэтиленовые'},
  ]},
  {id:'plates',label:'Тарелки',emoji:'🍽️',sub:[
    {id:'plates_paper',label:'Бумажные'},
    {id:'plates_plastic',label:'Пластиковые'},
  ]},
];
function getCats(){
  try{var s=localStorage.getItem('up_cats');if(s)return JSON.parse(s);}catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_CATS));
}
function saveCats(l){
  localStorage.setItem('up_cats',JSON.stringify(l));
  fsPatch('settings/categories',{data:{stringValue:JSON.stringify(l)}},null);
}
function loadCatsFromFirebase(cb){
  fsGet('settings/categories',function(doc,err){
    if(!err&&doc&&doc.fields&&doc.fields.data){
      try{
        var list=JSON.parse(fsVal(doc.fields.data));
        if(Array.isArray(list)&&list.length){
          localStorage.setItem('up_cats',JSON.stringify(list));
          if(cb)cb(list);return;
        }
      }catch(e){}
    }
    fsPatch('settings/categories',{data:{stringValue:JSON.stringify(DEFAULT_CATS)}},null);
    if(cb)cb(DEFAULT_CATS);
  });
}
function getCatLabel(cid,sid){
  var cats=getCats(),c=cats.find(function(x){return x.id===cid;});
  if(!c)return cid||'';
  if(!sid)return c.emoji+' '+c.label;
  var s=c.sub.find(function(x){return x.id===sid;});
  return c.emoji+' '+c.label+(s?' › '+s.label:'');
}

// ═══════════════════════════════════════════════════════════
//  ТОВАРЫ — localStorage + Firebase
// ═══════════════════════════════════════════════════════════
var DEFAULT_PRODUCTS=[
  {id:1,name:'Контейнер пластиковый 500мл',meta:'Полипропилен PP, крышка в комплекте',price:4.90,oldPrice:6.50,cat:'containers',subCat:'containers_plastic',badge:'hit',emoji:'📦',photo:'',material:'Полипропилен PP',volume:'500 мл',size:'18×13×5 см',packQty:50},
  {id:2,name:'Контейнер крафт 750мл',meta:'Крафт-картон, водостойкий',price:8.20,oldPrice:null,cat:'containers',subCat:'containers_paper',badge:'eco',emoji:'🟫',photo:'',material:'Крафт-картон',volume:'750 мл',size:'20×15×6 см',packQty:25},
  {id:3,name:'Контейнер фольга 1л',meta:'Алюминий, для духовки',price:12.00,oldPrice:null,cat:'containers',subCat:'containers_foil',badge:null,emoji:'🫙',photo:'',material:'Алюминий',volume:'1000 мл',size:'22×16×7 см',packQty:10},
  {id:4,name:'Стакан бумажный 350мл',meta:'Бумага, для горячих напитков',price:3.10,oldPrice:null,cat:'cups',subCat:'cups_paper',badge:'new',emoji:'☕',photo:'',material:'Бумага',volume:'350 мл',size:'D90×H110 мм',packQty:50},
  {id:5,name:'Стакан ПЭТ 400мл',meta:'Прозрачный, с крышкой',price:2.70,oldPrice:null,cat:'cups',subCat:'cups_plastic',badge:null,emoji:'🥤',photo:'',material:'ПЭТ',volume:'400 мл',size:'D95×H130 мм',packQty:50},
  {id:6,name:'Пакет крафт 24×32',meta:'Без ручек, с плоским дном',price:6.50,oldPrice:8.00,cat:'bags',subCat:'bags_kraft',badge:'sale',emoji:'🛍️',photo:'',material:'Крафт-бумага',volume:'—',size:'24×32 см',packQty:100},
  {id:7,name:'Пакет майка 40×60',meta:'HDPE полиэтилен',price:1.20,oldPrice:null,cat:'bags',subCat:'bags_plastic',badge:null,emoji:'👜',photo:'',material:'HDPE',volume:'—',size:'40×60 см',packQty:100},
  {id:8,name:'Тарелка бумажная 18см',meta:'Мелованная бумага',price:3.80,oldPrice:null,cat:'plates',subCat:'plates_paper',badge:'eco',emoji:'🍽️',photo:'',material:'Бумага мелованная',volume:'—',size:'D180 мм',packQty:100},
];
function getProducts(){
  try{var s=localStorage.getItem('up_products');if(s)return JSON.parse(s);}catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
}
function saveProducts(l){localStorage.setItem('up_products',JSON.stringify(l));}
function nextId(){var p=getProducts();return p.length?Math.max.apply(null,p.map(function(x){return x.id;}))+1:1;}
function getPhoto(id){var p=getProducts().find(function(x){return x.id===id;});return(p&&p.photo)?p.photo:'';}

function loadProductsFromServer(cb){
  fsGet('products/catalog',function(doc,err){
    if(!err&&doc&&doc.fields&&doc.fields.data){
      try{
        var list=JSON.parse(fsVal(doc.fields.data));
        if(Array.isArray(list)&&list.length){saveProducts(list);if(cb)cb(list);return;}
      }catch(e){}
    }
    saveProductsToFirebase(DEFAULT_PRODUCTS,function(){saveProducts(DEFAULT_PRODUCTS);if(cb)cb(DEFAULT_PRODUCTS);});
  });
}
function saveProductsToFirebase(products,cb){
  fsPatch('products/catalog',{data:{stringValue:JSON.stringify(products)}},cb);
}

// ═══════════════════════════════════════════════════════════
//  ЗАКАЗЫ
//
//  Схема хранения:
//  - orders/{orderId}           — все заказы (для админа)
//  - users/{uid}/orders/{orderId} — заказы конкретного юзера
//
//  Так каждый пользователь читает только свои заказы,
//  а админ читает все из корневой коллекции orders/.
// ═══════════════════════════════════════════════════════════

// Сохранить заказ — пишем в оба места параллельно
function saveOrderToFirebase(order, cb){
  var fields = objToFields(order);
  var done = 0;
  function finish(){ done++; if(done===2 && cb) cb(null); }
  // 1. В общую коллекцию заказов (для админа)
  fsSet('orders/'+order.id, fields, finish);
  // 2. В подколлекцию пользователя (если авторизован)
  if(order.userId){
    fsSet('users/'+order.userId+'/orders/'+order.id, fields, finish);
  } else {
    finish(); // нет пользователя — только в общую
  }
}

// Загрузить все заказы (для админки)
function loadOrdersFromFirebase(cb){
  fsList('orders', function(docs, err){
    if(err){ if(cb)cb([],err); return; }
    var orders = docs.map(docToObj).filter(Boolean);
    orders.sort(function(a,b){return(b.createdAt||0)-(a.createdAt||0);});
    if(cb)cb(orders, null);
  });
}

// Загрузить заказы пользователя из его подколлекции — не требует индексов
function loadOrdersByUser(uid, cb){
  fsList('users/'+uid+'/orders', function(docs, err){
    if(err){ if(cb)cb([]); return; }
    var orders = docs.map(docToObj).filter(Boolean);
    orders.sort(function(a,b){return(b.createdAt||0)-(a.createdAt||0);});
    if(cb)cb(orders);
  });
}

function updateOrderStatusInFirebase(id, status, cb){
  var f = {status:{stringValue:status}};
  var done=0;
  function finish(){ done++; if(done>=1&&cb) cb(null); }
  fsPatch('orders/'+id, f, finish);
  // Попробовать обновить и в подколлекции — но мы не знаем uid, так что только корень
}

function deleteOrderFromFirebase(id, cb){ fsDelete('orders/'+id, cb); }

function deleteAllOrdersFromFirebase(cb){
  fsList('orders', function(docs){
    if(!docs.length){if(cb)cb();return;}
    var n=docs.length, done=0;
    docs.forEach(function(doc){
      fsDelete('orders/'+(doc.name||'').split('/').pop(), function(){if(++done>=n&&cb)cb();});
    });
  });
}

// Polling новых заказов для админки
var _lastOrderCount=0, _orderPollTimer=null;
function startOrderPolling(onNew){
  if(_orderPollTimer) return;
  _orderPollTimer=setInterval(function(){
    loadOrdersFromFirebase(function(orders){
      var n=orders.filter(function(o){return o.status==='new';}).length;
      if(_lastOrderCount>0 && n>_lastOrderCount && onNew) onNew(orders[0]);
      _lastOrderCount=n;
    });
  }, 5000);
}

// ═══════════════════════════════════════════════════════════
//  КОРЗИНА — только localStorage
// ═══════════════════════════════════════════════════════════
function getOrders(){try{return JSON.parse(localStorage.getItem('up_orders')||'[]');}catch(e){return[];}}
function saveOrders(l){localStorage.setItem('up_orders',JSON.stringify(l));}

// ═══════════════════════════════════════════════════════════
//  СЖАТИЕ ФОТО
// ═══════════════════════════════════════════════════════════
function compressPhoto(dataUrl,cb){
  var img=new Image();
  img.onload=function(){
    var MAX=1200,w=img.width,h=img.height;
    if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
    var c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').drawImage(img,0,0,w,h);cb(c.toDataURL('image/jpeg',0.85));
  };
  img.onerror=function(){cb(dataUrl);};img.src=dataUrl;
}
