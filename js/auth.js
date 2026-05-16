// ═══════════════════════════════════════════════════════════
//  FIREBASE AUTH — REST API
// ═══════════════════════════════════════════════════════════
var AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts:';

function getCurrentUser(){
  try{ return JSON.parse(sessionStorage.getItem('up_user')||'null'); }catch(e){ return null; }
}
function setCurrentUser(u){ sessionStorage.setItem('up_user',JSON.stringify(u)); }
function clearCurrentUser(){ sessionStorage.removeItem('up_user'); }

// ── Регистрация ────────────────────────────────────────────
function authRegister(email, password, name, cb){
  fetch(AUTH_BASE+'signUp?key='+FIREBASE_CONFIG.apiKey,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:password,returnSecureToken:true})
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.error){ cb(authErrMsg(d.error.message),null); return; }
    var user={uid:d.localId, email:d.email, name:name||d.email.split('@')[0], token:d.idToken};
    setCurrentUser(user);
    // Гарантированно сохранить профиль в Firestore (даже если поля минимальные)
    saveUserProfile(user.uid, {
      name:      user.name,
      email:     user.email,
      createdAt: Date.now(),
      uid:       user.uid
    }, function(){
      cb(null, user);
    });
  })
  .catch(function(e){ cb(e.message,null); });
}

// ── Вход ──────────────────────────────────────────────────
function authLogin(email, password, cb){
  fetch(AUTH_BASE+'signInWithPassword?key='+FIREBASE_CONFIG.apiKey,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:password,returnSecureToken:true})
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.error){ cb(authErrMsg(d.error.message),null); return; }
    var user={uid:d.localId, email:d.email, name:d.displayName||d.email.split('@')[0], token:d.idToken};
    setCurrentUser(user);
    // Подгрузить имя из профиля
    loadUserProfile(user.uid, function(profile){
      if(profile&&profile.name) user.name=profile.name;
      setCurrentUser(user);
      // Если профиль пустой — создать
      if(!profile || !profile.email){
        saveUserProfile(user.uid, {
          name:      user.name,
          email:     user.email,
          createdAt: Date.now(),
          uid:       user.uid
        }, null);
      }
      cb(null,user);
    });
  })
  .catch(function(e){ cb(e.message,null); });
}

// ── Выход ─────────────────────────────────────────────────
function authLogout(){ clearCurrentUser(); updateAuthUI(); }

// ── Сброс пароля ──────────────────────────────────────────
function authResetPassword(email, cb){
  fetch(AUTH_BASE+'sendOobCode?key='+FIREBASE_CONFIG.apiKey,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({requestType:'PASSWORD_RESET',email:email})
  })
  .then(function(r){ return r.json(); })
  .then(function(d){ cb(d.error?authErrMsg(d.error.message):null); })
  .catch(function(e){ cb(e.message); });
}

// ── Заказы пользователя ────────────────────────────────────
function loadUserOrders(uid, cb){
  // Использует loadOrdersByUser из data.js — читает из подколлекции users/{uid}/orders
  loadOrdersByUser(uid, cb);
}

// ── UI шапки ───────────────────────────────────────────────
function updateAuthUI(){
  var user=getCurrentUser();
  var btn=document.getElementById('auth-btn');
  if(!btn) return;
  if(user){
    btn.innerHTML=
      '<span class="auth-avatar">'+
        (user.name||user.email).charAt(0).toUpperCase()+
      '</span>'+
      '<span class="auth-name">'+(user.name||user.email).split(' ')[0]+'</span>';
    btn.onclick=function(){ location.href='account.html'; };
  } else {
    btn.innerHTML='👤 Войти';
    btn.onclick=function(){ openAuthModal('login'); };
  }
}

// ── Перевод ошибок ────────────────────────────────────────
function authErrMsg(code){
  var map={
    'EMAIL_EXISTS':            'Этот email уже зарегистрирован',
    'INVALID_EMAIL':           'Неверный формат email',
    'WEAK_PASSWORD':           'Пароль должен быть не менее 6 символов',
    'EMAIL_NOT_FOUND':         'Пользователь с таким email не найден',
    'INVALID_PASSWORD':        'Неверный пароль',
    'USER_DISABLED':           'Аккаунт заблокирован',
    'INVALID_LOGIN_CREDENTIALS':'Неверный email или пароль',
    'TOO_MANY_ATTEMPTS_TRY_LATER':'Слишком много попыток, подождите',
  };
  return map[code]||code;
}
