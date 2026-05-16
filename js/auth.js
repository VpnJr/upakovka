// ═══════════════════════════════════════════════════════════
//  FIREBASE AUTH — REST API (без SDK)
// ═══════════════════════════════════════════════════════════
var AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts:';

// ── Текущий пользователь ───────────────────────────────────
function getCurrentUser(){
  try{return JSON.parse(sessionStorage.getItem('up_user')||'null');}catch(e){return null;}
}
function setCurrentUser(u){sessionStorage.setItem('up_user',JSON.stringify(u));}
function clearCurrentUser(){sessionStorage.removeItem('up_user');}

// ── Регистрация ────────────────────────────────────────────
function authRegister(email, password, name, cb){
  fetch(AUTH_BASE+'signUp?key='+FIREBASE_CONFIG.apiKey,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:password,returnSecureToken:true})
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.error){cb(_authErr(d.error.message),null);return;}
    var user={uid:d.localId, email:d.email, name:name||email.split('@')[0], token:d.idToken};
    setCurrentUser(user);
    // Сохранить профиль в users/{uid}
    _patchUserProfile(user.uid, {name:user.name, email:user.email, createdAt:Date.now()}, user.token);
    cb(null, user);
  })
  .catch(function(e){cb(e.message,null);});
}

// ── Вход ──────────────────────────────────────────────────
function authLogin(email, password, cb){
  fetch(AUTH_BASE+'signInWithPassword?key='+FIREBASE_CONFIG.apiKey,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:password,returnSecureToken:true})
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.error){cb(_authErr(d.error.message),null);return;}
    var user={uid:d.localId, email:d.email, name:d.email.split('@')[0], token:d.idToken};
    // Загрузить имя из профиля
    _getUserProfile(user.uid, user.token, function(profile){
      if(profile && profile.name) user.name = profile.name;
      setCurrentUser(user);
      cb(null, user);
    });
  })
  .catch(function(e){cb(e.message,null);});
}

// ── Выход ──────────────────────────────────────────────────
function authLogout(){clearCurrentUser(); updateAuthUI();}

// ── Сброс пароля ───────────────────────────────────────────
function authResetPassword(email, cb){
  fetch(AUTH_BASE+'sendOobCode?key='+FIREBASE_CONFIG.apiKey,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({requestType:'PASSWORD_RESET',email:email})
  })
  .then(function(r){return r.json();})
  .then(function(d){cb(d.error?_authErr(d.error.message):null);})
  .catch(function(e){cb(e.message);});
}

// ── Профиль пользователя ───────────────────────────────────
function _patchUserProfile(uid, data, token){
  var fields={};
  Object.keys(data).forEach(function(k){
    fields[k]=typeof data[k]==='number'?{integerValue:String(data[k])}:{stringValue:String(data[k])};
  });
  var mask=Object.keys(data).map(function(k){return 'updateMask.fieldPaths='+k;}).join('&');
  var h={'Content-Type':'application/json'};
  if(token) h['Authorization']='Bearer '+token;
  fetch(FS+'/users/'+uid+'?'+mask,{method:'PATCH',headers:h,body:JSON.stringify({fields:fields})})
    .catch(function(){});
}

function _getUserProfile(uid, token, cb){
  var h={'Content-Type':'application/json'};
  if(token) h['Authorization']='Bearer '+token;
  fetch(FS+'/users/'+uid,{headers:h})
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d||!d.fields){cb(null);return;}
      var p={};
      Object.keys(d.fields).forEach(function(k){p[k]=fsVal(d.fields[k]);});
      cb(p);
    })
    .catch(function(){cb(null);});
}

// Публичная функция для account.html
function saveUserProfile(uid, data, cb){
  var user=getCurrentUser();
  _patchUserProfile(uid, data, user?user.token:null);
  if(cb) setTimeout(cb, 300);
}

// ── Заказы пользователя ────────────────────────────────────
// Читаем из users/{uid}/orders/ — только свои, не нужны индексы
function loadUserOrders(uid, cb){
  var user = getCurrentUser();
  if(!user || !uid){ cb([]); return; }

  // Firestore REST query: ищем заказы где userId == uid
  var projectId = FIREBASE_CONFIG.projectId;
  var url = 'https://firestore.googleapis.com/v1/projects/' + projectId +
            '/databases/(default)/documents:runQuery';

  var body = {
    structuredQuery: {
      from: [{ collectionId: 'orders' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'userId' },
          op: 'EQUAL',
          value: { stringValue: uid }
        }
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }]
    }
  };

  var headers = { 'Content-Type': 'application/json' };
  if(user.token) headers['Authorization'] = 'Bearer ' + user.token;

  fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!Array.isArray(data)){ cb([]); return; }
      var orders = data
        .filter(function(item){ return item.document; })
        .map(function(item){ return docToObj(item.document); })
        .filter(Boolean);
      cb(orders);
    })
    .catch(function(){ cb([]); });
}

// ── UI шапки ───────────────────────────────────────────────
function updateAuthUI(){
  var user=getCurrentUser();
  var btn=document.getElementById('auth-btn');
  if(!btn) return;
  if(user){
    btn.innerHTML=
      '<span class="auth-avatar">'+((user.name||user.email).charAt(0).toUpperCase())+'</span>'+
      '<span class="auth-name">'+((user.name||user.email).split(' ')[0])+'</span>';
    btn.onclick=function(){location.href='account.html';};
  } else {
    btn.innerHTML='👤 Войти';
    btn.onclick=function(){openAuthModal('login');};
  }
}

// ── Перевод ошибок Firebase ────────────────────────────────
function _authErr(code){
  var m={
    'EMAIL_EXISTS':               'Этот email уже зарегистрирован',
    'INVALID_EMAIL':              'Неверный формат email',
    'WEAK_PASSWORD':              'Пароль — минимум 6 символов',
    'EMAIL_NOT_FOUND':            'Пользователь не найден',
    'INVALID_PASSWORD':           'Неверный пароль',
    'USER_DISABLED':              'Аккаунт заблокирован',
    'TOO_MANY_ATTEMPTS_TRY_LATER':'Слишком много попыток, подождите',
    'INVALID_LOGIN_CREDENTIALS':  'Неверный email или пароль',
  };
  // Обрезаем до первого пробела для совпадения с ключами типа WEAK_PASSWORD : ...
  return m[code] || m[code.split(' ')[0]] || code;
}
