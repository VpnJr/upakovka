// ═══════════════════════════════════════════════════════
//  FIREBASE AUTH — REST API
// ═══════════════════════════════════════════════════════
var AUTH_KEY  = FIREBASE_CONFIG.apiKey;
var AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts:';

// ── Текущий пользователь ───────────────────────────────
function getCurrentUser(){
  try{ return JSON.parse(sessionStorage.getItem('up_user')||'null'); }catch(e){ return null; }
}
function setCurrentUser(u){ sessionStorage.setItem('up_user', JSON.stringify(u)); }
function clearCurrentUser(){ sessionStorage.removeItem('up_user'); }

// ── Регистрация ────────────────────────────────────────
function authRegister(email, password, name, cb){
  fetch(AUTH_BASE+'signUp?key='+AUTH_KEY,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:password,returnSecureToken:true})
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.error){cb(authErr(d.error.message),null);return;}
    var user={uid:d.localId,email:d.email,name:name||email.split('@')[0],token:d.idToken};
    setCurrentUser(user);
    _saveUserProfile(user.uid,{name:user.name,email:user.email,createdAt:Date.now()},null);
    cb(null,user);
  })
  .catch(function(e){cb(e.message,null);});
}

// ── Вход ──────────────────────────────────────────────
function authLogin(email, password, cb){
  fetch(AUTH_BASE+'signInWithPassword?key='+AUTH_KEY,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:password,returnSecureToken:true})
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.error){cb(authErr(d.error.message),null);return;}
    var user={uid:d.localId,email:d.email,name:d.displayName||d.email.split('@')[0],token:d.idToken};
    setCurrentUser(user);
    // Загрузить имя из профиля
    _loadUserProfile(user.uid,function(profile){
      if(profile&&profile.name) user.name=profile.name;
      setCurrentUser(user);
      cb(null,user);
    });
  })
  .catch(function(e){cb(e.message,null);});
}

// ── Выход ──────────────────────────────────────────────
function authLogout(){ clearCurrentUser(); updateAuthUI(); }

// ── Сброс пароля ───────────────────────────────────────
function authResetPassword(email,cb){
  fetch(AUTH_BASE+'sendOobCode?key='+AUTH_KEY,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({requestType:'PASSWORD_RESET',email:email})
  })
  .then(function(r){return r.json();})
  .then(function(d){if(d.error)cb(authErr(d.error.message));else cb(null);})
  .catch(function(e){cb(e.message);});
}

// ── Профиль в Firestore ────────────────────────────────
function _saveUserProfile(uid,data,cb){
  var fields={};
  Object.keys(data).forEach(function(k){
    if(typeof data[k]==='number') fields[k]={integerValue:String(data[k])};
    else fields[k]={stringValue:String(data[k])};
  });
  var mask=Object.keys(data).map(function(k){return 'updateMask.fieldPaths='+k;}).join('&');
  fetch(FS+'/users/'+uid+'?'+mask,{
    method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fields:fields})
  }).then(function(){if(cb)cb();}).catch(function(){if(cb)cb();});
}
function saveUserProfile(uid,data,cb){ _saveUserProfile(uid,data,cb); }

function _loadUserProfile(uid,cb){
  fsGet('users/'+uid,function(err,doc){
    if(err||!doc||!doc.fields){cb(null);return;}
    var p={};
    Object.keys(doc.fields).forEach(function(k){p[k]=fsVal(doc.fields[k]);});
    cb(p);
  });
}
function loadUserProfile(uid,cb){ _loadUserProfile(uid,cb); }

// ── Заказы пользователя ────────────────────────────────
// Использует Firestore REST query для фильтрации по userId или userEmail
function loadUserOrders(uid,cb){
  var user=getCurrentUser();
  if(!user){cb([]);return;}

  // Запрос к Firestore: найти заказы где userId == uid ИЛИ userEmail == email
  // Firestore не поддерживает OR в одном запросе — делаем два запроса
  var results=[];
  var done=0;

  function tryBoth(){
    // Запрос 1: по userId
    _queryOrders('userId',uid,function(orders1){
      results=results.concat(orders1||[]);
      done++;
      if(done===2) finish();
    });
    // Запрос 2: по userEmail
    _queryOrders('userEmail',user.email,function(orders2){
      results=results.concat(orders2||[]);
      done++;
      if(done===2) finish();
    });
  }

  function finish(){
    // Убрать дубли по id
    var seen={};
    var unique=results.filter(function(o){
      if(!o||seen[o.id]) return false;
      seen[o.id]=true;
      return true;
    });
    unique.sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});
    cb(unique);
  }

  tryBoth();
}

// Firestore structured query — ищет документы в коллекции orders где поле = значение
function _queryOrders(field,value,cb){
  var url='https://firestore.googleapis.com/v1/projects/'+FIREBASE_CONFIG.projectId+
          '/databases/(default)/documents:runQuery';
  var body={
    structuredQuery:{
      from:[{collectionId:'orders'}],
      where:{
        fieldFilter:{
          field:{fieldPath:field},
          op:'EQUAL',
          value:{stringValue:value}
        }
      }
    }
  };
  var headers={'Content-Type':'application/json'};
  var tok=getCurrentUser()&&getCurrentUser().token;
  if(tok) headers['Authorization']='Bearer '+tok;

  fetch(url,{method:'POST',headers:headers,body:JSON.stringify(body)})
    .then(function(r){return r.json();})
    .then(function(results){
      if(!Array.isArray(results)){cb([]);return;}
      var orders=results
        .filter(function(r){return r.document;})
        .map(function(r){return docToObj(r.document);})
        .filter(Boolean);
      cb(orders);
    })
    .catch(function(){cb([]);});
}

// ── UI шапки ───────────────────────────────────────────
function updateAuthUI(){
  var user=getCurrentUser();
  var btn=document.getElementById('auth-btn');
  if(!btn) return;
  if(user){
    btn.innerHTML='<span class="auth-avatar">'+
      (user.name||user.email).charAt(0).toUpperCase()+'</span>'+
      '<span class="auth-name">'+(user.name||user.email).split(' ')[0]+'</span>';
    btn.onclick=function(){location.href='account.html';};
  } else {
    btn.innerHTML='👤 Войти';
    btn.onclick=function(){openAuthModal('login');};
  }
}

// ── Перевод ошибок Firebase ────────────────────────────
function authErr(code){
  var map={
    'EMAIL_EXISTS':          'Этот email уже зарегистрирован',
    'INVALID_EMAIL':         'Неверный формат email',
    'WEAK_PASSWORD':         'Пароль должен быть не менее 6 символов',
    'EMAIL_NOT_FOUND':       'Пользователь не найден',
    'INVALID_PASSWORD':      'Неверный пароль',
    'USER_DISABLED':         'Аккаунт заблокирован',
    'TOO_MANY_ATTEMPTS_TRY_LATER':'Слишком много попыток, подождите',
    'INVALID_LOGIN_CREDENTIALS':'Неверный email или пароль',
  };
  return map[code]||code;
}
