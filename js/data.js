var DEFAULT_PRODUCTS = [
  {id:1,name:'Контейнер пластиковый 500мл',meta:'Полипропилен PP, крышка в комплекте',price:4.90,oldPrice:6.50,cat:'containers',badge:'hit',emoji:'📦',photo:'',material:'Полипропилен PP',volume:'500 мл',size:'18×13×5 см'},
  {id:2,name:'Контейнер крафт 750мл',meta:'Крафт-картон, водостойкий',price:8.20,oldPrice:null,cat:'containers',badge:'eco',emoji:'🟫',photo:'',material:'Крафт-картон',volume:'750 мл',size:'20×15×6 см'},
  {id:3,name:'Контейнер фольга 1л',meta:'Алюминий, для духовки',price:12.00,oldPrice:null,cat:'containers',badge:null,emoji:'🫙',photo:'',material:'Алюминий',volume:'1000 мл',size:'22×16×7 см'},
  {id:4,name:'Стакан бумажный 350мл',meta:'Бумага, для горячих напитков',price:3.10,oldPrice:null,cat:'cups',badge:'new',emoji:'☕',photo:'',material:'Бумага',volume:'350 мл',size:'D90×H110 мм'},
  {id:5,name:'Стакан ПЭТ 400мл',meta:'Прозрачный, с крышкой',price:2.70,oldPrice:null,cat:'cups',badge:null,emoji:'🥤',photo:'',material:'ПЭТ',volume:'400 мл',size:'D95×H130 мм'},
  {id:6,name:'Пакет крафт 24×32',meta:'Без ручек, с плоским дном',price:6.50,oldPrice:8.00,cat:'bags',badge:'sale',emoji:'🛍️',photo:'',material:'Крафт-бумага',volume:'—',size:'24×32 см'},
  {id:7,name:'Пакет майка 40×60',meta:'HDPE полиэтилен',price:1.20,oldPrice:null,cat:'bags',badge:null,emoji:'👜',photo:'',material:'HDPE',volume:'—',size:'40×60 см'},
  {id:8,name:'Тарелка бумажная 18см',meta:'Мелованная бумага',price:3.80,oldPrice:null,cat:'plates',badge:'eco',emoji:'🍽️',photo:'',material:'Бумага мелованная',volume:'—',size:'D180 мм'},
];

function getProducts(){
  try{
    var s=localStorage.getItem('up_products');
    if(s) return JSON.parse(s);
  }catch(e){}
  localStorage.setItem('up_products',JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}
function saveProducts(list){ localStorage.setItem('up_products',JSON.stringify(list)); }
function nextId(){ var p=getProducts(); return p.length?Math.max.apply(null,p.map(function(x){return x.id;}))+1:1; }
function getOrders(){ try{return JSON.parse(localStorage.getItem('up_orders')||'[]');}catch(e){return[];} }
function saveOrders(list){ localStorage.setItem('up_orders',JSON.stringify(list)); }
