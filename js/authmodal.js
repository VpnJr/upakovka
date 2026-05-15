// ═══════════════════════════════════════════════════════
//  МОДАЛКА АВТОРИЗАЦИИ — вставляется в DOM динамически
// ═══════════════════════════════════════════════════════

function ensureAuthModal(){
  if(document.getElementById('auth-modal')) return;
  var div = document.createElement('div');
  div.innerHTML = `
<div id="auth-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:2000;padding:20px">
  <div style="background:#fff;border-radius:16px;width:400px;max-width:100%;box-shadow:0 24px 60px rgba(0,0,0,.2);overflow:hidden">
    <!-- Переключатель -->
    <div style="display:flex;border-bottom:1px solid var(--border)">
      <button id="am-tab-login" onclick="switchAuthTab('login')"
        style="flex:1;padding:16px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;background:var(--brand);color:#fff;transition:all .15s">
        Войти
      </button>
      <button id="am-tab-reg" onclick="switchAuthTab('reg')"
        style="flex:1;padding:16px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;background:var(--gray);color:var(--muted);transition:all .15s">
        Регистрация
      </button>
    </div>
    <div style="padding:24px">
      <div id="am-err" style="display:none;color:#b91c1c;font-size:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:14px"></div>
      <!-- Имя — только при регистрации -->
      <div id="am-name-row" style="display:none;margin-bottom:14px">
        <label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:5px">Ваше имя</label>
        <input id="am-name" type="text" placeholder="Иван Иванов"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;outline:none;font-family:inherit;box-sizing:border-box"/>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:5px">Email</label>
        <input id="am-email" type="email" placeholder="example@mail.ru"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;outline:none;font-family:inherit;box-sizing:border-box"/>
      </div>
      <div style="margin-bottom:20px">
        <label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:5px">Пароль</label>
        <input id="am-pass" type="password" placeholder="Минимум 6 символов"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;outline:none;font-family:inherit;box-sizing:border-box"/>
      </div>
      <button id="am-submit" onclick="submitAuth()"
        style="width:100%;background:var(--brand);color:#fff;border:none;border-radius:8px;padding:12px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s">
        Войти
      </button>
      <div id="am-reset-row" style="text-align:center;margin-top:12px">
        <button onclick="doResetPassword()"
          style="background:none;border:none;font-size:12px;color:var(--muted);cursor:pointer;font-family:inherit;text-decoration:underline">
          Забыли пароль?
        </button>
      </div>
    </div>
    <button onclick="closeAuthModal()"
      style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.8);border:none;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">
      ✕
    </button>
  </div>
</div>`;
  document.body.appendChild(div.firstElementChild);
  // Закрыть по клику вне
  document.getElementById('auth-modal').addEventListener('click', function(e){
    if(e.target === this) closeAuthModal();
  });
  // Enter в полях
  ['am-email','am-pass','am-name'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('keydown', function(e){ if(e.key==='Enter') submitAuth(); });
  });
}

function openAuthModal(tab){
  ensureAuthModal();
  switchAuthTab(tab || 'login');
  document.getElementById('auth-modal').style.display = 'flex';
  setTimeout(function(){ var el=document.getElementById('am-email'); if(el) el.focus(); }, 50);
}

function closeAuthModal(){
  var m = document.getElementById('auth-modal');
  if(m) m.style.display = 'none';
}

var _authTab = 'login';
function switchAuthTab(tab){
  _authTab = tab;
  var isReg = tab === 'reg';
  var tl = document.getElementById('am-tab-login');
  var tr = document.getElementById('am-tab-reg');
  var nr = document.getElementById('am-name-row');
  var sb = document.getElementById('am-submit');
  var rr = document.getElementById('am-reset-row');
  var err = document.getElementById('am-err');
  if(tl){ tl.style.background = isReg ? 'var(--gray)' : 'var(--brand)'; tl.style.color = isReg ? 'var(--muted)' : '#fff'; }
  if(tr){ tr.style.background = isReg ? 'var(--brand)' : 'var(--gray)'; tr.style.color = isReg ? '#fff' : 'var(--muted)'; }
  if(nr) nr.style.display = isReg ? 'block' : 'none';
  if(sb) sb.textContent = isReg ? 'Создать аккаунт' : 'Войти';
  if(rr) rr.style.display = isReg ? 'none' : 'block';
  if(err) err.style.display = 'none';
  var pass = document.getElementById('am-pass');
  if(pass) pass.value = '';
}

function showAuthErr(msg){
  var el = document.getElementById('am-err');
  if(el){ el.textContent = msg; el.style.display = 'block'; }
}

function submitAuth(){
  var email = (document.getElementById('am-email').value || '').trim();
  var pass  = (document.getElementById('am-pass').value || '');
  var name  = (document.getElementById('am-name') ? document.getElementById('am-name').value.trim() : '');
  var btn   = document.getElementById('am-submit');

  if(!email){ showAuthErr('Введите email'); return; }
  if(!pass || pass.length < 6){ showAuthErr('Пароль — минимум 6 символов'); return; }

  btn.disabled = true; btn.textContent = '⏳ Подождите…';

  if(_authTab === 'reg'){
    authRegister(email, pass, name, function(err, user){
      btn.disabled = false; btn.textContent = 'Создать аккаунт';
      if(err){ showAuthErr(err); return; }
      closeAuthModal();
      updateAuthUI();
      // Перейти в кабинет
      location.href = 'account.html';
    });
  } else {
    authLogin(email, pass, function(err, user){
      btn.disabled = false; btn.textContent = 'Войти';
      if(err){ showAuthErr(err); return; }
      closeAuthModal();
      updateAuthUI();
    });
  }
}

function doResetPassword(){
  var email = (document.getElementById('am-email').value || '').trim();
  if(!email){ showAuthErr('Введите email для сброса пароля'); return; }
  authResetPassword(email, function(err){
    if(err){ showAuthErr(err); return; }
    showAuthErr('');
    var el = document.getElementById('am-err');
    if(el){ el.textContent = '✓ Письмо отправлено — проверьте почту'; el.style.color='#16a34a'; el.style.display='block'; }
  });
}

// Инициализация UI при загрузке страницы
document.addEventListener('DOMContentLoaded', function(){
  updateAuthUI();
});
