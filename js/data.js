// ═══════════════════════════════════════════════════════
//  FIREBASE CONFIG
// ═══════════════════════════════════════════════════════
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC5WmllONH_dKc8z8kF-WXwbQ7nl1i42VM",
  authDomain:        "upakovka09-c97d1.firebaseapp.com",
  projectId:         "upakovka09-c97d1",
  storageBucket:     "upakovka09-c97d1.firebasestorage.app",
  messagingSenderId: "402891810707",
  appId:             "1:402891810707:web:0980f659518bf4394f6a66"
};

// ImgBB для фото
var IMGBB_KEY = '605aad32ee4f662d7c61875d4e055c66';

// ═══════════════════════════════════════════════════════
//  FIRESTORE REST API
//  Используем REST напрямую — без SDK, работает везде
// ═══════════════════════════════════════════════════════
var FS_BASE = 'https://firestore.googleapis.com/v1/projects/' +
              FIREBASE_CONFIG.projectId + '/databases/(default)/documents';

// Получить все товары из Firestore
function loadProductsFromFirebase(cb) {
  fetch(FS_BASE + '/products/catalog')
    .then(function(r) { return r.json(); })
    .then(function(doc) {
      if (doc && doc.fields && doc.fields.data) {
        var json = doc.fields.data.stringValue;
        var list = JSON.parse(json);
        if (Array.isArray(list) && list.length) {
          saveProducts(list); // кешируем локально
          if (cb) cb(list);
          return;
        }
      }
      // Документа ещё нет — создадим дефолтные
      saveProductsToFirebase(DEFAULT_PRODUCTS, function() {
        saveProducts(DEFAULT_PRODUCTS);
        if (cb) cb(DEFAULT_PRODUCTS);
      });
    })
    .catch(function(e) {
      console.warn('Firebase load error:', e);
      if (cb) cb(getProducts());
    });
}

// Сохранить товары в Firestore
function saveProductsToFirebase(products, cb) {
  var body = {
    fields: {
      data: { stringValue: JSON.stringify(products) }
    }
  };
  fetch(FS_BASE + '/products/catalog?updateMask.fieldPaths=data', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (cb) cb(true);
    })
    .catch(function(e) {
      console.error('Firebase save error:', e);
      if (cb) cb(false);
    });
}

// Алиас для обратной совместимости
function loadProductsFromServer(cb) {
  loadProductsFromFirebase(cb);
}

// ═══════════════════════════════════════════════════════
//  КАТЕГОРИИ — localStorage
// ═══════════════════════════════════════════════════════
var DEFAULT_CATS = [
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
  localStorage.setItem('up_cats',JSON.stringify(DEFAULT_CATS));
  return JSON.parse(JSON.stringify(DEFAULT_CATS));
}
function saveCats(l){localStorage.setItem('up_cats',JSON.stringify(l));}
function getCatLabel(cid,sid){
  var cats=getCats(),c=cats.find(function(x){return x.id===cid;});
  if(!c)return cid||'';
  if(!sid)return c.emoji+' '+c.label;
  var s=c.sub.find(function(x){return x.id===sid;});
  return c.emoji+' '+c.label+(s?' › '+s.label:'');
}

// ═══════════════════════════════════════════════════════
//  ТОВАРЫ — localStorage как кеш, Firebase как источник
// ═══════════════════════════════════════════════════════
var DEFAULT_PRODUCTS = [
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
function nextId(){
  var p=getProducts();
  return p.length?Math.max.apply(null,p.map(function(x){return x.id;}))+1:1;
}
function getPhoto(productId){
  var p=getProducts().find(function(x){return x.id===productId;});
  return(p&&p.photo)?p.photo:'';
}

// ═══════════════════════════════════════════════════════
//  ЗАКАЗЫ — localStorage
// ═══════════════════════════════════════════════════════
function getOrders(){try{return JSON.parse(localStorage.getItem('up_orders')||'[]');}catch(e){return[];}}
function saveOrders(l){localStorage.setItem('up_orders',JSON.stringify(l));}

// ═══════════════════════════════════════════════════════
//  СЖАТИЕ ФОТО
// ═══════════════════════════════════════════════════════
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
