function getCart(){ try{return JSON.parse(localStorage.getItem('up_cart')||'[]');}catch(e){return[];} }
function saveCart(c){ localStorage.setItem('up_cart',JSON.stringify(c)); }

function addToCart(productId, qty){
  qty = qty || 1;
  var cart = getCart();
  var found = cart.find(function(i){return i.id===productId;});
  if(found){ found.qty += qty; } else { cart.push({id:productId, qty:qty}); }
  saveCart(cart);
  refreshCartUI();
  showCartToast();
}
function removeFromCart(productId){
  saveCart(getCart().filter(function(i){return i.id!==productId;}));
  refreshCartUI();
}
function updateCartQty(productId, qty){
  if(qty <= 0){ removeFromCart(productId); return; }
  var cart = getCart();
  var found = cart.find(function(i){return i.id===productId;});
  if(found){ found.qty = qty; saveCart(cart); refreshCartUI(); }
}
function clearCart(){ saveCart([]); refreshCartUI(); }

function getCartTotal(){
  return getCart().reduce(function(s,item){
    var p = getProducts().find(function(x){return x.id===item.id;});
    return s + (p ? p.price*item.qty : 0);
  }, 0);
}
function getCartCount(){ return getCart().reduce(function(s,i){return s+i.qty;},0); }

function refreshCartUI(){
  var count = getCartCount();
  var total = getCartTotal();
  document.querySelectorAll('.cart-count-badge').forEach(function(el){el.textContent=count;});
  // Показываем сумму в кнопке корзины
  var sumEl = document.getElementById('cart-sum');
  if(sumEl){
    if(total > 0){
      sumEl.textContent = '· ' + total.toFixed(0) + ' ₽';
      sumEl.style.display = 'inline';
    } else {
      sumEl.style.display = 'none';
    }
  }
  renderCartDrawer();
}
function showCartToast(){
  var t = document.getElementById('cart-toast');
  if(!t) return;
  t.classList.add('show');
  clearTimeout(window._ctt);
  window._ctt = setTimeout(function(){t.classList.remove('show');}, 2200);
}

function renderCartDrawer(){
  var el = document.getElementById('cart-drawer-body');
  if(!el) return;
  var cart = getCart(), products = getProducts();
  var footer = document.getElementById('cart-drawer-footer');

  if(!cart.length){
    el.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Корзина пуста</p><button class="btn-outline" onclick="closeCart()">Перейти в каталог</button></div>';
    if(footer) footer.style.display = 'none';
    return;
  }
  if(footer) footer.style.display = 'block';

  el.innerHTML = cart.map(function(item){
    var p = products.find(function(x){return x.id===item.id;});
    if(!p) return '';
    var photo = getPhoto(p.id);
    var img = photo ? '<img src="'+photo+'" alt="'+p.name+'">' : '<span class="ci-emoji">'+p.emoji+'</span>';
    var pack = p.packQty ? p.packQty : 1;
    return '<div class="cart-item">'+
      '<div class="ci-img">'+img+'</div>'+
      '<div class="ci-info">'+
        '<div class="ci-name">'+p.name+'</div>'+
        '<div class="ci-meta">'+p.price.toFixed(2)+' ₽ / шт · в пачке '+pack+' шт</div>'+
        '<div class="ci-controls">'+
          '<div class="ci-qty-ctrl">'+
            '<button onclick="updateCartQty('+p.id+','+Math.max(pack,item.qty-pack)+')">−</button>'+
            '<span>'+item.qty+'</span>'+
            '<button onclick="updateCartQty('+p.id+','+(item.qty+pack)+')">+</button>'+
          '</div>'+
          '<button class="ci-del" onclick="removeFromCart('+p.id+')" title="Удалить">🗑</button>'+
        '</div>'+
      '</div>'+
      '<div class="ci-total">'+(p.price*item.qty).toFixed(2)+' ₽</div>'+
    '</div>';
  }).join('');

  var tv = document.getElementById('cart-total-val');
  if(tv) tv.textContent = getCartTotal().toFixed(2) + ' ₽';
}

function openCart(){
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-drawer').classList.add('open');
  renderCartDrawer();
}
function closeCart(){
  var o = document.getElementById('cart-overlay');
  var d = document.getElementById('cart-drawer');
  if(o) o.classList.remove('open');
  if(d) d.classList.remove('open');
}
