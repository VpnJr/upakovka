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

var FS = 'https://firestore.googleapis.com/v1/projects/' +
         FIREBASE_CONFIG.projectId + '/databases/(default)/documents';

// ── Заголовки (токен если есть) ─────────────────────────────
// Заголовки для GET (без Content-Type)
function _h(){
  var h = {};
  var tok = (typeof _adminToken !== 'undefined' && _adminToken)
          ? _adminToken
          : (typeof getCurrentUser === 'function' && getCurrentUser())
            ? getCurrentUser().token : null;
  if(tok) h['Authorization'] = 'Bearer ' + tok;
  return h;
}
// Заголовки для POST/PATCH (с Content-Type)
function _hw(){
  var h = {'Content-Type':'application/json'};
  var tok = (typeof _adminToken !== 'undefined' && _adminToken)
          ? _adminToken
          : (typeof getCurrentUser === 'function' && getCurrentUser())
            ? getCurrentUser().token : null;
  if(tok) h['Authorization'] = 'Bearer ' + tok;
  return h;
}

// ── Firestore REST ───────────────────────────────────────────
// Все callbacks: cb(result, error) — result=null при ошибке
function fsGet(path, cb){
  fetch(FS+'/'+path, {headers:_h()})
    .then(function(r){ return r.json(); })
    .then(function(d){ if(d.error) cb(null,d.error); else cb(d,null); })
    .catch(function(e){ cb(null,e); });
}

function fsPatch(path, fields, cb){
  var mask = Object.keys(fields).map(function(k){ return 'updateMask.fieldPaths='+k; }).join('&');
  fetch(FS+'/'+path+'?'+mask, {method:'PATCH', headers:_hw(), body:JSON.stringify({fields:fields})})
    .then(function(r){ return r.json(); })
    .then(function(d){ if(cb) cb(d.error?null:d, d.error||null); })
    .catch(function(e){ if(cb) cb(null,e); });
}

function fsSet(path, fields, cb){
  fetch(FS+'/'+path, {method:'PATCH', headers:_hw(), body:JSON.stringify({fields:fields})})
    .then(function(r){ return r.json(); })
    .then(function(d){ if(cb) cb(d.error?null:d, d.error||null); })
    .catch(function(e){ if(cb) cb(null,e); });
}

function fsDelete(path, cb){
  fetch(FS+'/'+path, {method:'DELETE', headers:_hw()})
    .then(function(){ if(cb) cb(null); })
    .catch(function(e){ if(cb) cb(e); });
}

function fsList(path, cb){
  fetch(FS+'/'+path, {headers:_h()})
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.error){ cb([], d.error); return; }
      cb(d.documents || [], null);
    })
    .catch(function(e){ cb([], e); });
}

// Firestore Query — поиск документов с фильтром
function fsQuery(collection, field, op, value, cb){
  var url = 'https://firestore.googleapis.com/v1/projects/' +
            FIREBASE_CONFIG.projectId + '/databases/(default)/documents:runQuery';
  var body = {
    structuredQuery: {
      from: [{collectionId: collection}],
      where: {
        fieldFilter: {
          field: {fieldPath: field},
          op: op || 'EQUAL',
          value: {stringValue: value}
        }
      }
    }
  };
  fetch(url, {method:'POST', headers:_hw(), body:JSON.stringify(body)})
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!Array.isArray(data)){ cb([], null); return; }
      var docs = data
        .filter(function(item){ return item.document; })
        .map(function(item){ return item.document; });
      cb(docs, null);
    })
    .catch(function(e){ cb([], e); });
}

// ── Конвертация Firestore ↔ JS ───────────────────────────────
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
    Object.keys(f).forEach(function(k){ obj[k]=fsVal(f[k]); });
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
    Object.keys(v).forEach(function(k){ fields[k]=toFsVal(v[k]); });
    return {mapValue:{fields:fields}};
  }
  return {stringValue:String(v)};
}

function docToObj(doc){
  if(!doc||!doc.fields) return null;
  var obj = {_id:(doc.name||'').split('/').pop()};
  Object.keys(doc.fields).forEach(function(k){ obj[k]=fsVal(doc.fields[k]); });
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
          if(cb)cb(list); return;
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
//  ТОВАРЫ — localStorage кеш + Firebase
// ═══════════════════════════════════════════════════════════
// Дефолтные товары убраны — каталог пуст если Firebase пуст
function getProducts(){
  try{
    var s=localStorage.getItem('up_products');
    if(s){
      var list=JSON.parse(s);
      // Если в кеше дефолтные товары без фото — не используем их
      // Ждём загрузки из Firebase
      return Array.isArray(list)?list:[];
    }
  }catch(e){}
  return []; // Возвращаем пустой список, Firebase загрузит актуальные
}

// Принудительно очистить кеш товаров (вызывается при необходимости)
function clearProductsCache(){
  localStorage.removeItem('up_products');
}
function saveProducts(l){ localStorage.setItem('up_products',JSON.stringify(l)); }
function nextId(){
  var p=getProducts();
  return p.length?Math.max.apply(null,p.map(function(x){return x.id;}))+1:1;
}
function getPhoto(id){
  var p=getProducts().find(function(x){return x.id===id;});
  return(p&&p.photo)?p.photo:'';
}
function loadProductsFromServer(cb){
  fsGet('products/catalog',function(doc,err){
    if(!err&&doc&&doc.fields&&doc.fields.data){
      try{
        var list=JSON.parse(fsVal(doc.fields.data));
        if(Array.isArray(list)&&list.length){
          // Обновляем кеш актуальными данными из Firebase
          saveProducts(list);
          if(cb)cb(list); return;
        }
      }catch(e){}
    }
    // Документа нет — НЕ записываем дефолтные, просто возвращаем пустой список
    // Данные добавляются только через админку
    if(err){
      // Ошибка сети — используем кеш
      if(cb)cb(getProducts());
    } else {
      // Документ пустой — возвращаем пустой список
      saveProducts([]);
      if(cb)cb([]);
    }
  });
}
function saveProductsToFirebase(products,cb){
  fsPatch('products/catalog',{data:{stringValue:JSON.stringify(products)}},function(d,e){
    if(cb)cb(e?null:d,e||null);
  });
}

// ═══════════════════════════════════════════════════════════
//  ЗАКАЗЫ
//  Сохраняем в ДВА места:
//  1. /orders/{id}              — для админа (читает все)
//  2. /users/{uid}/orders/{id}  — для клиента (читает только свои)
// ═══════════════════════════════════════════════════════════
function saveOrderToFirebase(order, cb){
  var fields = objToFields(order);
  // 1. Общая коллекция
  fsSet('orders/'+order.id, fields, function(){
    // 2. Подколлекция пользователя (если авторизован)
    if(order.userId){
      fsSet('users/'+order.userId+'/orders/'+order.id, fields, function(){
        if(cb) cb(null);
      });
    } else {
      if(cb) cb(null);
    }
  });
}

// Все заказы — для админки
function loadOrdersFromFirebase(cb){
  fsList('orders', function(docs, err){
    if(err){ if(cb)cb([]); return; }
    var orders = docs.map(docToObj).filter(Boolean);
    orders.sort(function(a,b){ return(b.createdAt||0)-(a.createdAt||0); });
    if(cb) cb(orders);
  });
}

// Заказы конкретного пользователя — из его подколлекции
function loadOrdersByUser(uid, cb){
  fsList('users/'+uid+'/orders', function(docs, err){
    if(err||!docs.length){
      // Fallback: ищем через query в общей коллекции
      fsQuery('orders','userId','EQUAL',uid,function(docs2,err2){
        if(err2){ if(cb)cb([]); return; }
        var orders = docs2.map(docToObj).filter(Boolean);
        orders.sort(function(a,b){ return(b.createdAt||0)-(a.createdAt||0); });
        if(cb) cb(orders);
      });
      return;
    }
    var orders = docs.map(docToObj).filter(Boolean);
    orders.sort(function(a,b){ return(b.createdAt||0)-(a.createdAt||0); });
    if(cb) cb(orders);
  });
}

function updateOrderStatusInFirebase(id, status, cb){
  fsPatch('orders/'+id, {status:{stringValue:status}}, function(){ if(cb)cb(); });
}
function deleteOrderFromFirebase(id, cb){
  fsDelete('orders/'+id, function(){ if(cb)cb(); });
}
function deleteAllOrdersFromFirebase(cb){
  fsList('orders', function(docs){
    if(!docs||!docs.length){ if(cb)cb(); return; }
    var count=docs.length, done=0;
    docs.forEach(function(doc){
      var id=(doc.name||'').split('/').pop();
      fsDelete('orders/'+id, function(){ if(++done>=count&&cb)cb(); });
    });
  });
}

// Polling новых заказов
var _lastNewCount=0, _pollTimer=null;
function startOrderPolling(onNew){
  if(_pollTimer) return;
  _pollTimer=setInterval(function(){
    loadOrdersFromFirebase(function(orders){
      var newCount=orders.filter(function(o){return o.status==='new';}).length;
      if(_lastNewCount>0&&newCount>_lastNewCount&&onNew) onNew(orders[0]);
      _lastNewCount=newCount;
    });
  },5000);
}
function stopOrderPolling(){ if(_pollTimer){clearInterval(_pollTimer);_pollTimer=null;} }

// ═══════════════════════════════════════════════════════════
//  ПОЛЬЗОВАТЕЛИ — читает и сохраняет профили
// ═══════════════════════════════════════════════════════════
function saveUserProfile(uid, data, cb){
  fsSet('users/'+uid, objToFields(data), function(){ if(cb)cb(); });
}

function loadUserProfile(uid, cb){
  fsGet('users/'+uid, function(doc, err){
    if(err||!doc){ cb(null); return; }
    cb(docToObj(doc));
  });
}

// Все пользователи для админки
// Firestore LIST не возвращает документы с подколлекциями,
// поэтому получаем список через collectionGroup query
function loadAllUsers(cb){
  // Используем runQuery для получения всех документов в коллекции users
  var url = 'https://firestore.googleapis.com/v1/projects/' +
            FIREBASE_CONFIG.projectId + '/databases/(default)/documents:runQuery';
  var body = {
    structuredQuery: {
      from: [{collectionId: 'users', allDescendants: false}],
      // Ищем документы где есть поле email
      where: {
        fieldFilter: {
          field: {fieldPath: 'email'},
          op: 'GREATER_THAN_OR_EQUAL',
          value: {stringValue: ''}
        }
      }
    }
  };
  fetch(url, {method:'POST', headers:_hw(), body:JSON.stringify(body)})
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!Array.isArray(data)){ cb([]); return; }
      var users = data
        .filter(function(item){ return item.document; })
        .map(function(item){ return docToObj(item.document); })
        .filter(function(u){ return u && u.email; });
      cb(users);
    })
    .catch(function(){ cb([]); });
}

// ═══════════════════════════════════════════════════════════
//  КОРЗИНА и прочее — localStorage
// ═══════════════════════════════════════════════════════════
function getOrders(){ try{return JSON.parse(localStorage.getItem('up_orders')||'[]');}catch(e){return[];} }
function saveOrders(l){ localStorage.setItem('up_orders',JSON.stringify(l)); }

// ── Сжатие фото ─────────────────────────────────────────────
function compressPhoto(dataUrl,cb){
  var img=new Image();
  img.onload=function(){
    var MAX=1200,w=img.width,h=img.height;
    if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
    var c=document.createElement('canvas');
    c.width=w;c.height=h;
    c.getContext('2d').drawImage(img,0,0,w,h);
    cb(c.toDataURL('image/jpeg',0.85));
  };
  img.onerror=function(){cb(dataUrl);};
  img.src=dataUrl;
}
