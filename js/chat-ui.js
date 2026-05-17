// ═══════════════════════════════════════════════════════
//  CHAT UI — виджет чата для покупателя
// ═══════════════════════════════════════════════════════

var _chatOpen    = false;
var _chatMsgs    = [];
var _chatPending = []; // файлы ожидающие загрузки

function initChatWidget(){
  _ensureChatWidget();
  var user = getCurrentUser();
  if(!user) return;
  initUserChat(user);
  _chatId   = getChatId(user.uid);
  _chatRole = 'user';

  // Загружаем историю
  loadChatMessages(_chatId, function(msgs){
    _chatMsgs    = msgs;
    _lastMsgCount = msgs.length;
    _renderMessages();
    _scrollToBottom();
    markChatRead(_chatId, 'user');
  });

  // Polling новых сообщений
  startChatPoll(_chatId, 'user', function(newMsgs, allMsgs){
    _chatMsgs = allMsgs;
    _renderMessages();
    _scrollToBottom();
    if(_chatOpen) markChatRead(_chatId, 'user');
    else _showChatBadge(allMsgs.filter(function(m){return m.from==='admin'&&!m.readByUser;}).length);
    // Уведомление
    if(newMsgs.some(function(m){return m.from==='admin';})){
      _playChatSound();
    }
  });

  // Polling метаданных (adminTyping)
  startMetaPoll(_chatId, function(meta){
    var el = document.getElementById('chat-status');
    if(!el) return;
    if(meta.adminTyping) el.textContent = 'Поддержка печатает…';
    else el.textContent = '';
  });

  // Онлайн при фокусе
  document.addEventListener('visibilitychange', function(){
    _markOnline(!document.hidden);
  });
}

function _ensureChatWidget(){
  if(document.getElementById('chat-widget')) return;
  var div = document.createElement('div');
  div.innerHTML = `
<style>
#chat-fab{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:var(--brand);border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 20px rgba(123,30,46,.4);z-index:1000;transition:transform .2s}
#chat-fab:hover{transform:scale(1.08)}
#chat-fab-badge{position:absolute;top:-2px;right:-2px;background:#e74c3c;color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:none;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff}
#chat-widget{position:fixed;bottom:90px;right:24px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);display:none;flex-direction:column;z-index:1000;overflow:hidden}
.cw-head{background:var(--brand);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.cw-head-ava{width:38px;height:38px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.cw-head-info{flex:1;min-width:0}
.cw-head-title{font-weight:600;font-size:14px}
.cw-head-status{font-size:11px;opacity:.75}
.cw-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:4px;border-radius:6px;opacity:.8}
.cw-close:hover{opacity:1;background:rgba(255,255,255,.15)}
.cw-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8f5f5}
.cw-msg{display:flex;flex-direction:column;max-width:78%}
.cw-msg.from-admin{align-self:flex-start}
.cw-msg.from-user{align-self:flex-end}
.cw-bubble{padding:9px 13px;border-radius:16px;font-size:13px;line-height:1.5;word-break:break-word;position:relative}
.from-admin .cw-bubble{background:#fff;border:1px solid #e5e7eb;border-radius:4px 16px 16px 16px;color:#1a1a1a}
.from-user  .cw-bubble{background:var(--brand);color:#fff;border-radius:16px 4px 16px 16px}
.cw-time{font-size:10px;margin-top:3px;opacity:.5;padding:0 4px}
.from-user .cw-time{text-align:right}
.cw-status{font-size:10px;opacity:.6;text-align:right;margin-top:1px}
.cw-files{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.cw-thumb{width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid rgba(255,255,255,.3)}
.cw-file-btn{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer;text-decoration:none;color:inherit}
.cw-typing{display:flex;align-items:center;gap:4px;padding:8px 12px;align-self:flex-start}
.cw-dot{width:7px;height:7px;border-radius:50%;background:#9ca3af;animation:cw-bounce .8s infinite}
.cw-dot:nth-child(2){animation-delay:.15s}
.cw-dot:nth-child(3){animation-delay:.3s}
@keyframes cw-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
.cw-day-sep{text-align:center;font-size:11px;color:#9ca3af;margin:4px 0;display:flex;align-items:center;gap:8px}
.cw-day-sep::before,.cw-day-sep::after{content:'';flex:1;height:1px;background:#e5e7eb}
.cw-input-area{border-top:1px solid #e5e7eb;background:#fff;flex-shrink:0}
.cw-preview-bar{padding:8px 12px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #f3f4f6;display:none}
.cw-preview-item{position:relative;width:52px;height:52px;border-radius:8px;overflow:hidden;flex-shrink:0}
.cw-preview-item img,.cw-preview-item video{width:100%;height:100%;object-fit:cover}
.cw-preview-del{position:absolute;top:1px;right:1px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:16px;height:16px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.cw-file-preview{display:flex;align-items:center;gap:6px;font-size:11px;color:#374151;width:100%;padding:4px 0}
.cw-input-row{display:flex;align-items:flex-end;gap:8px;padding:10px 12px}
.cw-attach-btn{background:none;border:none;font-size:20px;cursor:pointer;padding:4px;color:#9ca3af;flex-shrink:0;line-height:1;transition:color .15s}
.cw-attach-btn:hover{color:var(--brand)}
.cw-textarea{flex:1;border:1.5px solid #e5e7eb;border-radius:12px;padding:8px 12px;font-size:13px;resize:none;outline:none;font-family:inherit;max-height:100px;overflow-y:auto;line-height:1.4;transition:border-color .15s}
.cw-textarea:focus{border-color:var(--brand)}
.cw-send{background:var(--brand);border:none;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:#fff;font-size:16px;transition:background .15s}
.cw-send:hover{background:var(--brand-l)}
.cw-send:disabled{opacity:.4;cursor:not-allowed}
#chat-status{font-size:11px;color:rgba(255,255,255,.7);min-height:14px}
</style>
<div id="chat-fab" onclick="toggleChat()">
  💬
  <div id="chat-fab-badge">0</div>
</div>
<div id="chat-widget">
  <div class="cw-head">
    <div class="cw-head-ava">🛒</div>
    <div class="cw-head-info">
      <div class="cw-head-title">Поддержка Upakovka09</div>
      <div id="chat-status">Онлайн</div>
    </div>
    <button class="cw-close" onclick="toggleChat()">✕</button>
  </div>
  <div class="cw-msgs" id="cw-msgs"></div>
  <div class="cw-input-area">
    <div class="cw-preview-bar" id="cw-preview-bar"></div>
    <div class="cw-input-row">
      <input type="file" id="cw-file-input" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" style="display:none" onchange="onChatFilePick(this)"/>
      <button class="cw-attach-btn" onclick="document.getElementById('cw-file-input').click()" title="Прикрепить файл">📎</button>
      <textarea class="cw-textarea" id="cw-textarea" placeholder="Написать сообщение…" rows="1"
        oninput="_autoResizeTA(this);_onTyping()"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitChatMsg();}"></textarea>
      <button class="cw-send" id="cw-send-btn" onclick="submitChatMsg()">➤</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(div);
}

function toggleChat(){
  var w = document.getElementById('chat-widget');
  _chatOpen = !_chatOpen;
  w.style.display = _chatOpen ? 'flex' : 'none';
  if(_chatOpen){
    _showChatBadge(0);
    markChatRead(_chatId, 'user');
    _scrollToBottom();
    document.getElementById('cw-textarea').focus();
  }
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
    if(day && day !== lastDay){ daySep='<div class="cw-day-sep">'+day+'</div>'; lastDay=day; }

    var filesHtml = _renderMsgFiles(m, isAdmin);
    var checkmark = !isAdmin ? _statusMark(m) : '';

    return daySep +
      '<div class="cw-msg '+cls+'">'+
        '<div class="cw-bubble">'+
          (m.text ? '<div>'+escHtmlChat(m.text)+'</div>' : '')+
          (filesHtml ? '<div class="cw-files">'+filesHtml+'</div>' : '')+
        '</div>'+
        '<div class="cw-time">'+( m.time||'' )+checkmark+'</div>'+
      '</div>';
  }).join('');

  // Добавить индикатор печати если нужно
  el.innerHTML = html;
}

function _renderMsgFiles(m, isAdmin){
  if(!m.files||!m.files.length) return '';
  // Собрать медиа для лайтбокса
  var media = m.files.map(function(f){ return {url:f.url,name:f.name,type:f.type}; });
  return m.files.map(function(f, i){
    var allMedia = JSON.stringify(media).replace(/"/g,'&quot;');
    if(f.type==='image'){
      return '<img class="cw-thumb" src="'+(f.thumb||f.url)+'" alt="'+escHtmlChat(f.name||'')+'" onclick="openLightbox(JSON.parse(this.dataset.media),'+i+')" data-media="'+allMedia+'">';
    } else if(f.type==='video'){
      return '<div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid rgba(255,255,255,.3)" onclick="openLightbox(JSON.parse(\''+allMedia.replace(/'/g,"\\'")+ '\'),'+i+')">'+
        '<video src="'+f.url+'" style="width:100%;height:100%;object-fit:cover"></video>'+
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(0,0,0,.3)">▶</div></div>';
    } else {
      return '<a class="cw-file-btn" href="'+f.url+'" download="'+escHtmlChat(f.name||'файл')+'" target="_blank">📄 '+escHtmlChat(f.name||'файл')+'</a>';
    }
  }).join('');
}

function _statusMark(m){
  if(m.readByAdmin) return ' <span style="color:#60a5fa">✓✓</span>';
  return ' <span style="opacity:.4">✓</span>';
}

function _scrollToBottom(){
  var el = document.getElementById('cw-msgs');
  if(el) setTimeout(function(){el.scrollTop=el.scrollHeight;},50);
}

function _autoResizeTA(ta){
  ta.style.height='auto';
  ta.style.height=Math.min(ta.scrollHeight,100)+'px';
}

function _onTyping(){
  setTyping(true);
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(function(){setTyping(false);}, CHAT_TYPING_TIMEOUT);
}

// ── Файлы ─────────────────────────────────────────────
function onChatFilePick(input){
  var files = Array.from(input.files);
  files.forEach(function(file){
    _chatPending.push({file:file, status:'pending', localUrl: URL.createObjectURL(file)});
  });
  _renderPreviewBar();
  input.value='';
}

function _renderPreviewBar(){
  var bar = document.getElementById('cw-preview-bar');
  if(!bar) return;
  if(!_chatPending.length){ bar.style.display='none'; return; }
  bar.style.display='flex';
  bar.innerHTML = _chatPending.map(function(p,i){
    var preview = p.file.type.startsWith('image/') || p.file.type.startsWith('video/')
      ? (p.file.type.startsWith('image/') ? '<img src="'+p.localUrl+'">' : '<video src="'+p.localUrl+'"></video>')
      : '<div class="cw-file-preview">📄 '+escHtmlChat(p.file.name)+'</div>';
    return '<div class="cw-preview-item">'+preview+'<button class="cw-preview-del" onclick="removePending('+i+')">✕</button></div>';
  }).join('');
}

function removePending(i){
  _chatPending.splice(i,1);
  _renderPreviewBar();
}

// ── Отправка ──────────────────────────────────────────
function submitChatMsg(){
  var ta   = document.getElementById('cw-textarea');
  var text = ta ? ta.value.trim() : '';
  if(!text && !_chatPending.length) return;

  var btn = document.getElementById('cw-send-btn');
  if(btn) btn.disabled = true;

  // Показать оптимистичное сообщение
  var tempMsg = {
    from:'user', text:text, time:new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),
    createdAt:Date.now(), files:[], readByAdmin:false, readByUser:true, _pending:true
  };
  _chatMsgs.push(tempMsg);
  _renderMessages();
  _scrollToBottom();
  if(ta){ ta.value=''; ta.style.height='auto'; }

  if(!_chatPending.length){
    _doSend(text,[],btn);
  } else {
    // Загрузить файлы последовательно
    var uploaded=[], idx=0;
    function uploadNext(){
      if(idx>=_chatPending.length){ _doSend(text,uploaded,btn); return; }
      var p=_chatPending[idx++];
      uploadChatFile(p.file, null, function(err,result){
        if(!err&&result) uploaded.push(result);
        uploadNext();
      });
    }
    uploadNext();
    _chatPending=[];
    _renderPreviewBar();
  }
}

function _doSend(text, files, btn){
  sendChatMessage(text, files, function(msg, msgId){
    // Заменить pending сообщение реальным
    var idx = _chatMsgs.findIndex(function(m){return m._pending;});
    if(idx>=0){ _chatMsgs[idx]=Object.assign({},msg,{_id:msgId,readByUser:true}); }
    _renderMessages();
    _scrollToBottom();
    if(btn) btn.disabled=false;
  });
}

function _playChatSound(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.setValueAtTime(520,ctx.currentTime);
    o.frequency.setValueAtTime(680,ctx.currentTime+.08);
    g.gain.setValueAtTime(.2,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);
    o.start();o.stop(ctx.currentTime+.35);
  }catch(e){}
}

function escHtmlChat(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
