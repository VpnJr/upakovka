// ═══════════════════════════════════════════════════════
//  FIREBASE AUTH — REST API (без SDK)
//  Документация: https://firebase.google.com/docs/reference/rest/auth
// ═══════════════════════════════════════════════════════
var AUTH_KEY = FIREBASE_CONFIG.apiKey;
var AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts:';

// ── Текущий пользователь (хранится в sessionStorage) ──
function getCurrentUser(){
  try{ return JSON.parse(sessionStorage.getItem('up_user') || 'null'); }catch(e){ return null; }
}
function setCurrentUser(u){ sessionStorage.setItem('up_user', JSON.stringify(u)); }
function clearCurrentUser(){ sessionStorage.removeItem('up_user'); }

// ── Регистрация ────────────────────────────────────────
function authRegister(email, password, name, cb){
  fetch(AUTH_BASE + 'signUp?key=' + AUTH_KEY, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email:email, password:password, returnSecureToken:true })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.error){ cb(authErr(d.error.message), null); return; }
    var user = { uid:d.localId, email:d.email, name:name||email.split('@')[0], token:d.idToken };
    setCurrentUser(user);
    // Сохранить профиль в Firestore
    saveUserProfile(user.uid, { name:user.name, email:user.email, createdAt:Date.now() }, null);
    cb(null, user);
  })
  .catch(function(e){ cb(e.message, null); });
}

// ── Вход ──────────────────────────────────────────────
function authLogin(email, password, cb){
  fetch(AUTH_BASE + 'signInWithPassword?key=' + AUTH_KEY, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email:email, password:password, returnSecureToken:true })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.error){ cb(authErr(d.error.message), null); return; }
    var user = { uid:d.localId, email:d.email, name:d.displayName||d.email.split('@')[0], token:d.idToken };
    setCurrentUser(user);
    // Загрузить имя из профиля
    loadUserProfile(user.uid, function(profile){
      if(profile && profile.name) user.name = profile.name;
      setCurrentUser(user);
      cb(null, user);
    });
  })
  .catch(function(e){ cb(e.message, null); });
}

// ── Выход ──────────────────────────────────────────────
function authLogout(){
  clearCurrentUser();
  updateAuthUI();
}

// ── Сброс пароля ───────────────────────────────────────
function authResetPassword(email, cb){
  fetch(AUTH_BASE + 'sendOobCode?key=' + AUTH_KEY, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ requestType:'PASSWORD_RESET', email:email })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.error){ cb(authErr(d.error.message)); return; }
    cb(null);
  })
  .catch(function(e){ cb(e.message); });
}

// ── Профиль пользователя в Firestore ──────────────────
function saveUserProfile(uid, data, cb){
  var fields = {};
  Object.keys(data).forEach(function(k){
    if(typeof data[k]==='number') fields[k]={integerValue:String(data[k])};
    else fields[k]={stringValue:String(data[k])};
  });
  fetch(FS + '/users/' + uid + '?updateMask.fieldPaths=' + Object.keys(data).join('&updateMask.fieldPaths='), {
    method:'PATCH',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({fields:fields})
  }).then(function(){ if(cb) cb(); }).catch(function(){ if(cb) cb(); });
}

function loadUserProfile(uid, cb){
  fsGet('users/' + uid, function(err, doc){
    if(err || !doc || !doc.fields){ cb(null); return; }
    var profile = {};
    Object.keys(doc.fields).forEach(function(k){ profile[k] = fsVal(doc.fields[k]); });
    cb(profile);
  });
}

// ── Заказы пользователя ────────────────────────────────
function loadUserOrders(uid, cb){
  // Загружаем все заказы и фильтруем по userId
  fsList('orders', function(err, docs){
    if(err){ cb([]); return; }
    var orders = docs.map(docToObj).filter(function(o){
      return o && (o.userId === uid || o.userEmail === getCurrentUser().email);
    });
    orders.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
    cb(orders);
  });
}

// ── Обновить UI шапки после входа/выхода ───────────────
function updateAuthUI(){
  var user = getCurrentUser();
  var btn  = document.getElementById('auth-btn');
  if(!btn) return;
  if(user){
    btn.innerHTML = '<span class="auth-avatar">' + (user.name||user.email).charAt(0).toUpperCase() + '</span>' +
                    '<span class="auth-name">' + (user.name||user.email).split(' ')[0] + '</span>';
    btn.onclick = function(){ location.href = 'account.html'; };
  } else {
    btn.innerHTML = '👤 Войти';
    btn.onclick = function(){ openAuthModal('login'); };
  }
}

// ── Перевод ошибок Firebase ────────────────────────────
function authErr(code){
  var map = {
    'EMAIL_EXISTS':          'Этот email уже зарегистрирован',
    'INVALID_EMAIL':         'Неверный формат email',
    'WEAK_PASSWORD':         'Пароль должен быть не менее 6 символов',
    'EMAIL_NOT_FOUND':       'Пользователь с таким email не найден',
    'INVALID_PASSWORD':      'Неверный пароль',
    'USER_DISABLED':         'Аккаунт заблокирован',
    'TOO_MANY_ATTEMPTS_TRY_LATER': 'Слишком много попыток, попробуйте позже',
    'INVALID_LOGIN_CREDENTIALS': 'Неверный email или пароль',
  };
  return map[code] || code;
}
