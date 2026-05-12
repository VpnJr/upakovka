// ============================================================
// ДАННЫЕ ТОВАРОВ
// Товары хранятся в localStorage.
// При первом запуске загружаются товары по умолчанию.
// Администратор может добавлять/редактировать/удалять товары
// через admin.html — изменения сразу отражаются на сайте.
// ============================================================

var DEFAULT_PRODUCTS = [
  {id:1, name:'Контейнер пластиковый 500мл', meta:'Полипропилен PP, крышка в комплекте', price:4.90, oldPrice:6.50, cat:'containers', badge:'hit', emoji:'📦', material:'Полипропилен PP', volume:'500 мл', size:'18×13×5 см'},
  {id:2, name:'Контейнер крафт 750мл',       meta:'Крафт-картон, водостойкий',           price:8.20, oldPrice:null, cat:'containers', badge:'eco', emoji:'🟫', material:'Крафт-картон',    volume:'750 мл', size:'20×15×6 см'},
  {id:3, name:'Контейнер фольга 1л',          meta:'Алюминий, пригоден для духовки',      price:12.00,oldPrice:null, cat:'containers', badge:null, emoji:'🫙', material:'Алюминий',         volume:'1000 мл',size:'22×16×7 см'},
  {id:4, name:'Стакан бумажный 350мл',        meta:'Бумага, для горячих напитков',        price:3.10, oldPrice:null, cat:'cups',       badge:'new', emoji:'☕', material:'Бумага',           volume:'350 мл', size:'D90×H110 мм'},
  {id:5, name:'Стакан ПЭТ 400мл',            meta:'Прозрачный, с крышкой',               price:2.70, oldPrice:null, cat:'cups',       badge:null, emoji:'🥤', material:'ПЭТ',              volume:'400 мл', size:'D95×H130 мм'},
  {id:6, name:'Пакет крафт 24×32',           meta:'Без ручек, с плоским дном',           price:6.50, oldPrice:8.00, cat:'bags',       badge:'sale',emoji:'🛍️',material:'Крафт-бумага',    volume:'—',      size:'24×32 см'},
  {id:7, name:'Пакет майка 40×60',           meta:'HDPE полиэтилен',                     price:1.20, oldPrice:null, cat:'bags',       badge:null, emoji:'👜', material:'HDPE',              volume:'—',      size:'40×60 см'},
  {id:8, name:'Тарелка бумажная 18см',       meta:'Мелованная бумага',                   price:3.80, oldPrice:null, cat:'plates',     badge:'eco', emoji:'🍽️',material:'Бумага мелованная',volume:'—',      size:'D180 мм'},
];

function getProducts(){
  var stored = localStorage.getItem('upakovka_products');
  if(stored){
    try{ return JSON.parse(stored); } catch(e){}
  }
  // Первый запуск — сохраняем дефолты
  localStorage.setItem('upakovka_products', JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}

function saveProducts(list){
  localStorage.setItem('upakovka_products', JSON.stringify(list));
}

function nextProductId(){
  var products = getProducts();
  if(!products.length) return 1;
  return Math.max.apply(null, products.map(function(p){ return p.id; })) + 1;
}
