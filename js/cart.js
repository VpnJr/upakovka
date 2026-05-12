function getCart(){ try{return JSON.parse(localStorage.getItem('up_cart')||'[]');}catch(e){return[];} }
function saveCart(c){ localStorage.setItem('up_cart',JSON.stringify(c)); }

function addToCart(productId, qty){
  qty=qty||50;
  var cart=getCart();
  var found=cart.find(function(i){return i.id===productId;});
  if(found){ found.qty+=qty; } else { cart.push({id:productId,qty:qty}); }
  saveCart(cart);
  refreshCartUI();
  showCartToast();
}

function removeFromCart(productId){
  saveCart(getCart().filter(function(i){return i.id!==productId;}));
  refreshCartUI();
}

function updateCartQty(productId, qty){
  var cart=getCart();
  var found=cart.find(function(i){return i.id===productId;});
  if(found){ if(qty<=0){ removeFromCart(productId); return; } found.qty=qty; }
  saveCart(cart);
  refreshCartUI();
}

function clearCart(){ saveCart([]); refreshCartUI(); }

function getCartTotal(){
  var prods=getProducts();
  return getCart().reduce(function(s,item){
    var p=prods.find(function(x){return x.id===item.id;});
    return s+(p?p.price*item.qty:0);
  },0);
}

function getCartCount(){ return getCart().reduce(function(s,i){return s+i.qty;},0); }

function refreshCartUI(){
  var count=getCartCount();
  document.querySelectorAll('.cart-count-badge').forEach(function(el){el.textContent=count;});
  renderCartDrawer();
}

function showCartToast(){
  var t=document.getElementById('cart-toast');
  if(!t) return;
  t.classList.add('show');
  clearTimeout(window._cartToastTimer);
  window._cartToastTimer=setTimeout(function(){t.classList.remove('show');},2000);
}

function renderCartDrawer(){
  var el=document.getElementById('cart-drawer-body');
  if(!el) return;
  var cart=getCart();
  var prods=getProducts();
  if(!cart.length){
    el.innerHTML='<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Корзина пуста</p><button class="btn-outline" onclick="closeCart()">Перейти в каталог</button></div>';
    var f=document.getElementById('cart-drawer-footer');
    if(f) f.style.display='none';
    return;
  }
  var f=document.getElementById('cart-drawer-footer');
  if(f) f.style.display='block';

  el.innerHTML=cart.map(function(item){
    var p=prods.find(function(x){return x.id===item.id;});
    if(!p) return '';
    var img=p.photo?'<img src="'+p.photo+'" alt="'+p.name+'">':'<span class="ci-emoji">'+p.emoji+'</span>';
    return '<div class="cart-item" id="ci-'+p.id+'">'+
      '<div class="ci-img">'+img+'</div>'+
      '<div class="ci-info">'+
        '<div class="ci-name">'+p.name+'</div>'+
        '<div class="ci-meta">'+p.price.toFixed(2)+' ₽ / шт</div>'+
        '<div class="ci-controls">'+
          '<div class="ci-qty-ctrl">'+
            '<button onclick="updateCartQty('+p.id+','+Math.max(0,item.qty-50)+')">−</button>'+
            '<span>'+item.qty+'</span>'+
            '<button onclick="updateCartQty('+p.id+','+(item.qty+50)+')">+</button>'+
          '</div>'+
          '<button class="ci-del" onclick="removeFromCart('+p.id+')" title="Удалить">🗑</button>'+
        '</div>'+
      '</div>'+
      '<div class="ci-total">'+(p.price*item.qty).toFixed(2)+' ₽</div>'+
    '</div>';
  }).join('');

  var total=getCartTotal();
  var tel=document.getElementById('cart-total-val');
  if(tel) tel.textContent=total.toFixed(2)+' ₽';
}

function openCart(){
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-drawer').classList.add('open');
  renderCartDrawer();
}
function closeCart(){
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-drawer').classList.remove('open');
}
