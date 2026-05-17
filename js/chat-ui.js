// ═══════════════════════════════════════════════════════
//  CHAT UI — виджет чата для покупателя
// ═══════════════════════════════════════════════════════
var _chatOpen    = false;
var _chatMsgs    = [];
var _chatPending = [];
var _lastMsgCount = 0;

// ── Гость или авторизованный пользователь ────────────
function _getChatUser(){
  var auth = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if(auth) return auth;
  // Гость — берём из localStorage или создаём
  var guest = null;
  try{ guest = JSON.parse(localStorage.getItem('up_guest_chat')||'null'); }catch(e){}
  return guest; // null если гость ещё не ввёл имя
}

function _createGuest(name){
  var id = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  var guest = { uid: id, name: name, email: '', isGuest: true };
  try{ localStorage.setItem('up_guest_chat', JSON.stringify(guest)); }catch(e){}
  return guest;
}

function initChatWidget(){
  _ensureChatWidget();
  // Показываем FAB всегда — даже для гостей
  var user = _getChatUser();
  if(user){
    _startChatForUser(user);
  }
  // Если нет пользователя — при открытии чата покажем форму ввода имени
}

function _startChatForUser(user){
  _chatId   = getChatId(user.uid);
  _chatRole = 'user';

  initUserChat(user);

  loadChatMessages(_chatId, function(msgs){
    _chatMsgs     = msgs;
    _lastMsgCount = msgs.length;
    _renderMessages();
    _scrollToBottom();
    markChatRead(_chatId, 'user');
  });

  startChatPoll(_chatId, 'user', function(newMsgs, allMsgs){
    _chatMsgs = allMsgs;
    _renderMessages();
    _scrollToBottom();
    if(_chatOpen) markChatRead(_chatId, 'user');
    else _showChatBadge(allMsgs.filter(function(m){ return m.from==='admin'&&!m.readByUser; }).length);
    if(newMsgs.some(function(m){ return m.from==='admin'; })) _playChatSound();
  });

  startMetaPoll(_chatId, function(meta){
    var el = document.getElementById('chat-status');
    if(!el) return;
    el.textContent = meta.adminTyping ? 'Поддержка печатает…' : 'Онлайн';
  });

  document.addEventListener('visibilitychange', function(){ _markOnline(!document.hidden); });
}

function _ensureChatWidget(){
  if(document.getElementById('chat-widget')) return;
  var div = document.createElement('div');
  div.innerHTML = '<style>\n'+
'#chat-fab{position:fixed;bottom:24px;right:24px;width:58px;height:58px;background:linear-gradient(135deg,#7B1E2E,#a52a3e);border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(123,30,46,.45);z-index:1000;transition:transform .2s,box-shadow .2s}\n'+
'#chat-fab:hover{transform:scale(1.1);box-shadow:0 6px 30px rgba(123,30,46,.55)}\n'+
'#chat-fab svg{width:26px;height:26px;fill:#fff}\n'+
'#chat-fab-badge{position:absolute;top:-3px;right:-3px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;min-width:20px;height:20px;border-radius:10px;display:none;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff;animation:badge-pop .3s ease}\n'+
'@keyframes badge-pop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}\n'+
'#chat-widget{position:fixed;bottom:94px;right:24px;width:370px;max-width:calc(100vw - 20px);height:540px;max-height:calc(100vh - 110px);background:#fff;border-radius:20px;box-shadow:0 12px 50px rgba(0,0,0,.2);display:none;flex-direction:column;z-index:1000;overflow:hidden;animation:chat-slide-in .25s ease}\n'+
'@keyframes chat-slide-in{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}\n'+
'.cw-head{background:linear-gradient(135deg,#7B1E2E,#a52a3e);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative}\n'+
'.cw-head::after{content:"";position:absolute;bottom:-1px;left:0;right:0;height:1px;background:rgba(0,0,0,.08)}\n'+
'.cw-head-ava{width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;border:2px solid rgba(255,255,255,.3)}\n'+
'.cw-head-info{flex:1;min-width:0}\n'+
'.cw-head-title{font-weight:700;font-size:14px;letter-spacing:.1px}\n'+
'.cw-head-status{font-size:11px;opacity:.8;margin-top:1px;display:flex;align-items:center;gap:4px}\n'+
'.cw-online-dot{width:7px;height:7px;background:#4ade80;border-radius:50%;flex-shrink:0}\n'+
'.cw-close{background:rgba(255,255,255,.15);border:none;color:#fff;font-size:16px;cursor:pointer;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0}\n'+
'.cw-close:hover{background:rgba(255,255,255,.25)}\n'+
'.cw-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;background:#f3eeee}\n'+
'.cw-msgs::-webkit-scrollbar{width:4px}\n'+
'.cw-msgs::-webkit-scrollbar-thumb{background:#d1b8bc;border-radius:2px}\n'+
'.cw-msg{display:flex;flex-direction:column;max-width:80%}\n'+
'.cw-msg.from-admin{align-self:flex-start}\n'+
'.cw-msg.from-user{align-self:flex-end}\n'+
'.cw-bubble{padding:10px 14px;border-radius:18px;font-size:13px;line-height:1.55;word-break:break-word;box-shadow:0 1px 3px rgba(0,0,0,.08)}\n'+
'.from-admin .cw-bubble{background:#fff;border-radius:4px 18px 18px 18px;color:#1a1a1a}\n'+
'.from-user  .cw-bubble{background:linear-gradient(135deg,#7B1E2E,#9b2535);color:#fff;border-radius:18px 4px 18px 18px}\n'+
'.cw-time{font-size:10px;margin-top:4px;opacity:.5;padding:0 4px;display:flex;align-items:center;gap:3px}\n'+
'.from-user .cw-time{justify-content:flex-end}\n'+
'.cw-files{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}\n'+
'.cw-thumb{width:90px;height:90px;object-fit:cover;border-radius:10px;cursor:pointer;border:2px solid rgba(255,255,255,.2);transition:opacity .15s}\n'+
'.cw-thumb:hover{opacity:.9}\n'+
'.cw-file-btn{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);border-radius:8px;padding:7px 11px;font-size:12px;cursor:pointer;text-decoration:none;color:inherit;border:1px solid rgba(255,255,255,.15)}\n'+
'.from-admin .cw-file-btn{background:#f3f4f6;color:#374151;border-color:#e5e7eb}\n'+
'.cw-typing{display:flex;align-items:center;gap:5px;padding:10px 14px;background:#fff;border-radius:4px 18px 18px 18px;box-shadow:0 1px 3px rgba(0,0,0,.08);align-self:flex-start}\n'+
'.cw-dot{width:7px;height:7px;border-radius:50%;background:#9ca3af;animation:cw-bounce .9s infinite}\n'+
'.cw-dot:nth-child(2){animation-delay:.18s}.cw-dot:nth-child(3){animation-delay:.36s}\n'+
'@keyframes cw-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}\n'+
'.cw-day-sep{text-align:center;font-size:11px;color:#9ca3af;margin:4px 0;display:flex;align-items:center;gap:8px}\n'+
'.cw-day-sep::before,.cw-day-sep::after{content:"";flex:1;height:1px;background:#e0d4d6}\n'+
'.cw-input-area{border-top:1px solid #f0e8e9;background:#fff;flex-shrink:0}\n'+
'.cw-preview-bar{padding:8px 12px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #f5f0f0;display:none}\n'+
'.cw-preview-item{position:relative;width:54px;height:54px;border-radius:10px;overflow:hidden;flex-shrink:0;border:1.5px solid #e5e7eb}\n'+
'.cw-preview-item img,.cw-preview-item video{width:100%;height:100%;object-fit:cover}\n'+
'.cw-preview-del{position:absolute;top:2px;right:2px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}\n'+
'.cw-input-row{display:flex;align-items:flex-end;gap:8px;padding:10px 12px}\n'+
'.cw-attach-btn{background:none;border:none;font-size:20px;cursor:pointer;padding:5px;color:#b0949b;flex-shrink:0;transition:color .15s;line-height:1}\n'+
'.cw-attach-btn:hover{color:#7B1E2E}\n'+
'.cw-textarea{flex:1;border:1.5px solid #e8dfe0;border-radius:14px;padding:9px 13px;font-size:13px;resize:none;outline:none;font-family:inherit;max-height:100px;overflow-y:auto;line-height:1.4;transition:border-color .15s;background:#faf7f7}\n'+
'.cw-textarea:focus{border-color:#7B1E2E;background:#fff}\n'+
'.cw-send{background:linear-gradient(135deg,#7B1E2E,#9b2535);border:none;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:#fff;font-size:16px;transition:transform .15s,box-shadow .15s;box-shadow:0 2px 8px rgba(123,30,46,.35)}\n'+
'.cw-send:hover{transform:scale(1.08);box-shadow:0 4px 12px rgba(123,30,46,.45)}\n'+
'.cw-send:disabled{opacity:.4;cursor:not-allowed;transform:none}\n'+
'#chat-status{font-size:11px;opacity:.85;min-height:14px}\n'+
'</style>\n'+
'<button id="chat-fab" onclick="toggleChat()" title="Написать нам">\n'+
'  <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>\n'+
'  <div id="chat-fab-badge">0</div>\n'+
'</button>\n'+
'<div id="chat-widget">\n'+
'  <div class="cw-head">\n'+
'    <div class="cw-head-ava">🛒</div>\n'+
'    <div class="cw-head-info">\n'+
'      <div class="cw-head-title">Поддержка Upakovka09</div>\n'+
'      <div class="cw-head-status"><span class="cw-online-dot"></span><span id="chat-status">Онлайн</span></div>\n'+
'    </div>\n'+
'    <button class="cw-close" onclick="toggleChat()">✕</button>\n'+
'  </div>\n'+
'  <div class="cw-msgs" id="cw-msgs"></div>\n'+
'  <div class="cw-input-area" id="cw-input-area-wrap">\n'+
'    <div class="cw-preview-bar" id="cw-preview-bar"></div>\n'+
'    <div class="cw-input-row">\n'+
'      <input type="file" id="cw-file-input" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" style="display:none" onchange="onChatFilePick(this)"/>\n'+
'      <button class="cw-attach-btn" onclick="document.getElementById(\'cw-file-input\').click()" title="Прикрепить файл">📎</button>\n'+
'      <textarea class="cw-textarea" id="cw-textarea" placeholder="Написать сообщение…" rows="1"\n'+
'        oninput="_autoResizeTA(this);_onTyping()"\n'+
'        onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();submitChatMsg();}"></textarea>\n'+
'      <button class="cw-send" id="cw-send-btn" onclick="submitChatMsg()">➤</button>\n'+
'    </div>\n'+
'  </div>\n'+
'</div>';
  document.body.appendChild(div);
}

function toggleChat(){
  var w = document.getElementById('chat-widget');
  _chatOpen = !_chatOpen;
  w.style.display = _chatOpen ? 'flex' : 'none';
  if(_chatOpen){
    // Если пользователь не инициализирован — показать форму имени
    if(!_chatId){
      var user = _getChatUser();
      if(user){
        _startChatForUser(user);
        _showChatContent();
      } else {
        _showNameForm();
        return;
      }
    }
    _showChatBadge(0);
    markChatRead(_chatId, 'user');
    _scrollToBottom();
    setTimeout(function(){ var el=document.getElementById('cw-textarea'); if(el) el.focus(); }, 100);
  }
}

function _showNameForm(){
  var msgs = document.getElementById('cw-msgs');
  var input= document.getElementById('cw-input-area-wrap');
  if(msgs) msgs.innerHTML =
    '<div id="cw-name-form" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:24px;text-align:center">'+
      '<div style="font-size:48px">👋</div>'+
      '<div style="font-size:16px;font-weight:600;color:#1a1a1a">Как вас зовут?</div>'+
      '<div style="font-size:13px;color:#9ca3af">Введите имя чтобы начать переписку</div>'+
      '<input id="cw-guest-name" type="text" placeholder="Ваше имя или никнейм"'+
        ' style="width:100%;padding:11px 14px;border:1.5px solid #e8dfe0;border-radius:12px;font-size:14px;outline:none;font-family:inherit;text-align:center;box-sizing:border-box;transition:border-color .15s"'+
        ' onkeydown="if(event.key===&quot;Enter&quot;) _submitGuestName()"/>'+
      '<button onclick="_submitGuestName()"'+
        ' style="width:100%;padding:12px;background:linear-gradient(135deg,#7B1E2E,#9b2535);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">'+
        'Начать чат →'+
      '</button>'+
    '</div>';
  // Скрыть инпут
  var ia = document.getElementById('cw-input-area-wrap');
  if(ia) ia.style.display = 'none';
  setTimeout(function(){ var el=document.getElementById('cw-guest-name'); if(el) el.focus(); }, 100);
}

function _showChatContent(){
  var ia = document.getElementById('cw-input-area-wrap');
  if(ia) ia.style.display = '';
}

function _submitGuestName(){
  var inp  = document.getElementById('cw-guest-name');
  var name = inp ? inp.value.trim() : '';
  if(!name){ if(inp){ inp.style.borderColor='#ef4444'; inp.placeholder='Введите имя'; } return; }
  var guest = _createGuest(name);
  _startChatForUser(guest);
  _showChatContent();
  // Перерисовать шапку
  var title = document.getElementById('cw-head-title');
  if(title) title.textContent = 'Поддержка Upakovka09';
  var msgs = document.getElementById('cw-msgs');
  if(msgs) msgs.innerHTML = '';
  _chatMsgs = [];
  _scrollToBottom();
  setTimeout(function(){ var ta=document.getElementById('cw-textarea'); if(ta) ta.focus(); }, 100);
}

function _showChatBadge(n){
  var b = document.getElementById('chat-fab-badge');
  if(!b) return;
  b.textContent = n;
  b.style.display = n > 0 ? 'flex' : 'none';
}

function _renderMessages(){
  var el = document.getElementById('cw-msgs');
  if(!el) return;
  var lastDay = '';
  var html = _chatMsgs.map(function(m){
    var isAdmin = m.from === 'admin';
    var cls     = isAdmin ? 'from-admin' : 'from-user';
    var day     = m.createdAt ? new Date(m.createdAt).toLocaleDateString('ru-RU',{day:'numeric',month:'long'}) : '';
    var daySep  = '';
    if(day && day !== lastDay){ daySep = '<div class="cw-day-sep">'+day+'</div>'; lastDay = day; }
    var filesHtml = _renderMsgFiles(m, isAdmin);
    var check = !isAdmin ? (m.readByAdmin ? ' <span style="color:rgba(255,255,255,.7)">✓✓</span>' : ' <span style="opacity:.4">✓</span>') : '';
    return daySep +
      '<div class="cw-msg '+cls+'">'+
        '<div class="cw-bubble">'+
          (m.text ? '<div>'+_escHtml(m.text)+'</div>' : '')+
          (filesHtml ? '<div class="cw-files">'+filesHtml+'</div>' : '')+
        '</div>'+
        '<div class="cw-time">'+( m.time||'' )+check+'</div>'+
      '</div>';
  }).join('');
  el.innerHTML = html;
}

function _renderMsgFiles(m, isAdmin){
  if(!m.files||!m.files.length) return '';
  var media = m.files.map(function(f){ return {url:f.url,name:f.name,type:f.type}; });
  var mStr  = JSON.stringify(media).replace(/"/g,'&quot;');
  return m.files.map(function(f,i){
    if(f.type==='image')
      return '<img class="cw-thumb" src="'+(f.thumb||f.url)+'" alt="" onclick="openLightbox(JSON.parse(this.dataset.media),'+i+')" data-media="'+mStr+'">';
    if(f.type==='video')
      return '<div style="position:relative;width:90px;height:90px;border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid rgba(255,255,255,.2)" onclick="openLightbox(JSON.parse(\''+mStr.replace(/\'/g,"\\'")+ '\'),'+i+')"><video src="'+f.url+'" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;background:rgba(0,0,0,.3)">▶</div></div>';
    return '<a class="cw-file-btn" href="'+f.url+'" download="'+_escHtml(f.name||'файл')+'" target="_blank">📄 '+_escHtml(f.name||'файл')+'</a>';
  }).join('');
}

function _scrollToBottom(){
  var el = document.getElementById('cw-msgs');
  if(el) setTimeout(function(){ el.scrollTop = el.scrollHeight; }, 50);
}

function _autoResizeTA(ta){
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
}

function _onTyping(){
  setTyping(true);
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(function(){ setTyping(false); }, CHAT_TYPING_TIMEOUT);
}

function onChatFilePick(input){
  Array.from(input.files).forEach(function(file){
    _chatPending.push({file:file, status:'pending', localUrl: URL.createObjectURL(file)});
  });
  _renderPreviewBar();
  input.value = '';
}

function _renderPreviewBar(){
  var bar = document.getElementById('cw-preview-bar');
  if(!bar) return;
  if(!_chatPending.length){ bar.style.display='none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = _chatPending.map(function(p,i){
    var preview = p.file.type.startsWith('image/')
      ? '<img src="'+p.localUrl+'">'
      : p.file.type.startsWith('video/')
        ? '<video src="'+p.localUrl+'"></video>'
        : '<div style="font-size:10px;padding:4px;color:#374151">📄</div>';
    return '<div class="cw-preview-item">'+preview+'<button class="cw-preview-del" onclick="removePending('+i+')">✕</button></div>';
  }).join('');
}

function removePending(i){ _chatPending.splice(i,1); _renderPreviewBar(); }

function submitChatMsg(){
  var ta   = document.getElementById('cw-textarea');
  var text = ta ? ta.value.trim() : '';
  if(!text && !_chatPending.length) return;

  var btn = document.getElementById('cw-send-btn');
  if(btn) btn.disabled = true;

  var tempMsg = {
    from:'user', text:text,
    time: new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),
    createdAt:Date.now(), files:[], readByAdmin:false, readByUser:true, _pending:true
  };
  _chatMsgs.push(tempMsg);
  _renderMessages(); _scrollToBottom();
  if(ta){ ta.value=''; ta.style.height='auto'; }

  if(!_chatPending.length){
    _doSend(text, [], btn);
  } else {
    var uploaded=[], idx=0;
    function uploadNext(){
      if(idx >= _chatPending.length){ _doSend(text, uploaded, btn); return; }
      var p = _chatPending[idx++];
      uploadChatFile(p.file, null, function(err,r){ if(!err&&r) uploaded.push(r); uploadNext(); });
    }
    uploadNext();
    _chatPending = []; _renderPreviewBar();
  }
}

function _doSend(text, files, btn){
  sendChatMessage(text, files, function(msg, msgId){
    var i = _chatMsgs.findIndex(function(m){ return m._pending; });
    if(i>=0) _chatMsgs[i] = Object.assign({}, msg, {_id:msgId, readByUser:true});
    _renderMessages(); _scrollToBottom();
    if(btn) btn.disabled = false;
  });
}

function _playChatSound(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(520,ctx.currentTime);
    o.frequency.setValueAtTime(680,ctx.currentTime+.08);
    g.gain.setValueAtTime(.18,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);
    o.start(); o.stop(ctx.currentTime+.35);
  }catch(e){}
}

function _escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
