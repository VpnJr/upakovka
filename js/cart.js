// ============================================================
// КОРЗИНА — хранится в localStorage
// ============================================================

function getCart(){
  try{ return JSON.parse(localStorage.getItem('upakovka_cart')||'[]'); }
  catch(e){ return []; }
}

function saveCart(cart){ localStorage.setItem('upakovka_cart', JSON.stringify(cart)); }

function addToCart(productId, qty){
  qty = qty || 50;
  var cart = getCart();
  var found = cart.find(function(i){ return i.id===productId; });
  if(found){ found.qty += qty; }
  else { cart.push({id:productId, qty:qty}); }
  saveCart(cart);
  updateCartBadge();
  renderCartBody();
}

function removeFromCart(productId){
  saveCart(getCart().filter(function(i){ return i.id!==productId; }));
  updateCartBadge();
  renderCartBody();
}

function clearCart(){ saveCart([]); updateCartBadge(); renderCartBody(); }

function getCartTotal(){
  var products = getProducts();
  return getCart().reduce(function(sum, item){
    var p = products.find(function(x){ return x.id===item.id; });
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function updateCartBadge(){
  var count = getCart().reduce(function(s,i){ return s+i.qty; }, 0);
  ['cart-count','cart-count2'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.textContent = count;
  });
}

function renderCartBody(){
  var el = document.getElementById('cart-body');
  if(!el) return;
  var cart = getCart();
  var products = getProducts();
  if(!cart.length){
    el.innerHTML = '<div class="cart-empty"><p>Корзина пуста</p><button class="btn-outline" onclick="closeCart()">В каталог</button></div>';
    return;
  }
  var items = cart.map(function(item){
    var p = products.find(function(x){ return x.id===item.id; });
    if(!p) return '';
    return '<div class="cart-item">'+
      '<div class="ci-img">'+p.emoji+'</div>'+
      '<div class="ci-info"><div class="ci-name">'+p.name+'</div><div class="ci-qty">'+item.qty+' шт. × '+p.price.toFixed(2)+' ₽</div></div>'+
      '<div class="ci-price">'+(p.price*item.qty).toFixed(2)+' ₽</div>'+
      '<button class="ci-del" onclick="removeFromCart('+p.id+')">✕</button>'+
    '</div>';
  }).join('');
  el.innerHTML = items +
    '<div class="cart-footer">'+
      '<div class="cart-total">Итого: <strong>'+getCartTotal().toFixed(2)+' ₽</strong></div>'+
      '<a href="checkout.html" class="btn-primary btn-block">Оформить заказ →</a>'+
    '</div>';
}

function openCart(){
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  renderCartBody();
}

function closeCart(){
  var s = document.getElementById('cart-sidebar');
  var o = document.getElementById('cart-overlay');
  if(s) s.classList.remove('open');
  if(o) o.classList.remove('open');
}
