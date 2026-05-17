// ═══════════════════════════════════════════════════════
//  CHAT ENGINE — Firebase Firestore
//
//  Структура:
//  chats/{chatId}                   — мета чата
//    .userId, .userEmail, .userName
//    .lastMsg, .lastTime, .unreadAdmin, .unreadUser
//    .userOnline, .userTyping, .adminTyping
//    .userLastSeen
//
//  chats/{chatId}/messages/{msgId}  — сообщения
//    .from ('user'|'admin'), .text, .time, .createdAt
//    .files [{url,name,type,thumb}]
//    .readByAdmin, .readByUser
// ═══════════════════════════════════════════════════════

var CHAT_POLL_MS  = 2000;   // опрос новых сообщений
var CHAT_META_MS  = 4000;   // опрос онлайн/печатает
var CHAT_TYPING_TIMEOUT = 3000;

var _chatId       = null;   // текущий чат
var _chatRole     = null;   // 'user' | 'admin'
var _chatPollTimer    = null;
var _chatMetaTimer    = null;
var _typingTimer      = null;
var _lastMsgCount     = 0;
var _lightboxMedia    = [];  // для галереи
var _lightboxIndex    = 0;

// ── ID чата ───────────────────────────────────────────
function getChatId(userId){
  return 'chat_' + userId;
}

// ── Инициализация чата для пользователя ───────────────
function initUserChat(user){
  _chatId   = getChatId(user.uid);
  _chatRole = 'user';

  // Обеспечить существование документа чата
  var fields = objToFields({
    userId:    user.uid,
    userEmail: user.email,
    userName:  user.name || user.email,
    lastMsg:   '',
    lastTime:  Date.now(),
    unreadAdmin: 0,
    unreadUser:  0,
    userLastSeen: Date.now(),
    userOnline:   true,
    userTyping:   false,
    adminTyping:  false,
  });
  // PATCH — создаст если не было, не затрёт если было
  fsPatch('chats/'+_chatId, {
    userId:    {stringValue: user.uid},
    userEmail: {stringValue: user.email},
    userName:  {stringValue: user.name || user.email},
  }, null);

  _markOnline(true);
  window.addEventListener('beforeunload', function(){ _markOnline(false); });
}

// ── Онлайн-статус ─────────────────────────────────────
function _markOnline(online){
  if(!_chatId) return;
  var fields = {
    userOnline:   {booleanValue: online},
    userLastSeen: {integerValue: String(Date.now())},
  };
  fetch(FS+'/chats/'+_chatId+'?updateMask.fieldPaths=userOnline&updateMask.fieldPaths=userLastSeen',{
    method:'PATCH', headers:_h(), body:JSON.stringify({fields:fields})
  }).catch(function(){});
}

// ── Статус «печатает» ─────────────────────────────────
function setTyping(isTyping){
  if(!_chatId) return;
  var field = _chatRole === 'user' ? 'userTyping' : 'adminTyping';
  var fields = {};
  fields[field] = {booleanValue: isTyping};
  var mask = '?updateMask.fieldPaths=' + field;
  fetch(FS+'/chats/'+_chatId+mask,{
    method:'PATCH', headers:_h(), body:JSON.stringify({fields:fields})
  }).catch(function(){});
}

// ── Отправить сообщение ───────────────────────────────
function sendChatMessage(text, files, cb){
  if(!_chatId) return;
  if(!text.trim() && (!files || !files.length)) return;

  var now = Date.now();
  var msgId = 'msg_' + now + '_' + Math.random().toString(36).slice(2,6);
  var msg = {
    from:       _chatRole,
    text:       text.trim(),
    createdAt:  now,
    time:       new Date(now).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),
    readByAdmin: _chatRole === 'admin',
    readByUser:  _chatRole === 'user',
    files:       files || [],
  };

  // Записать сообщение
  fsSet('chats/'+_chatId+'/messages/'+msgId, objToFields(msg), function(doc, err){
    if(err){ console.error('sendChatMessage error:', err); return; }

    // Обновить мета чата
    var unreadField = _chatRole === 'user' ? 'unreadAdmin' : 'unreadUser';
    var metaFields = {
      lastMsg:  {stringValue: text.trim() || (files&&files.length ? '📎 Файл' : '')},
      lastTime: {integerValue: String(now)},
      userTyping:  {booleanValue: false},
      adminTyping: {booleanValue: false},
    };
    // Увеличим счётчик непрочитанных
    fsGet('chats/'+_chatId, function(doc, err){
      var cur = (doc && doc.fields && doc.fields[unreadField]) ? parseInt(fsVal(doc.fields[unreadField]))||0 : 0;
      metaFields[unreadField] = {integerValue: String(cur+1)};
      var mask = Object.keys(metaFields).map(function(k){return 'updateMask.fieldPaths='+k;}).join('&');
      fetch(FS+'/chats/'+_chatId+'?'+mask,{
        method:'PATCH', headers:_h(), body:JSON.stringify({fields:metaFields})
      }).catch(function(){});
    });

    setTyping(false);
    if(cb) cb(msg, msgId);
  });
}

// ── Загрузить сообщения ───────────────────────────────
function loadChatMessages(chatId, cb){
  fsList('chats/'+chatId+'/messages', function(docs, err){
    if(err){ if(cb)cb([]); return; }
    var msgs = docs.map(docToObj).filter(Boolean);
    msgs.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
    if(cb) cb(msgs);
  });
}

// ── Пометить как прочитано ────────────────────────────
function markChatRead(chatId, role){
  var field = role === 'admin' ? 'unreadAdmin' : 'unreadUser';
  var mask  = '?updateMask.fieldPaths=' + field;
  var fields = {}; fields[field] = {integerValue:'0'};
  fetch(FS+'/chats/'+chatId+mask,{
    method:'PATCH', headers:_h(), body:JSON.stringify({fields:fields})
  }).catch(function(){});

  // Пометить все сообщения как прочитанные
  var readField = role === 'admin' ? 'readByAdmin' : 'readByUser';
  fsList('chats/'+chatId+'/messages', function(docs){
    docs.forEach(function(doc){
      var obj = docToObj(doc);
      if(obj && !obj[readField]){
        var id = doc.name.split('/').pop();
        var f={}; f[readField]={booleanValue:true};
        fetch(FS+'/chats/'+chatId+'/messages/'+id+'?updateMask.fieldPaths='+readField,{
          method:'PATCH', headers:_h(), body:JSON.stringify({fields:f})
        }).catch(function(){});
      }
    });
  });
}

// ── Загрузить все чаты (для админа) ──────────────────
function loadAllChats(cb){
  fsList('chats', function(docs, err){
    if(err){ if(cb)cb([]); return; }
    var chats = docs.map(docToObj).filter(Boolean);
    chats.sort(function(a,b){ return (b.lastTime||0)-(a.lastTime||0); });
    if(cb) cb(chats);
  });
}

// ── Загрузить мета одного чата ────────────────────────
function loadChatMeta(chatId, cb){
  fsGet('chats/'+chatId, function(doc, err){
    if(err||!doc){ if(cb)cb(null); return; }
    if(cb) cb(docToObj(doc));
  });
}

// ── Polling сообщений ─────────────────────────────────
function startChatPoll(chatId, role, onNew){
  stopChatPoll();
  _chatPollTimer = setInterval(function(){
    loadChatMessages(chatId, function(msgs){
      if(msgs.length > _lastMsgCount){
        var newMsgs = msgs.slice(_lastMsgCount);
        _lastMsgCount = msgs.length;
        if(onNew) onNew(newMsgs, msgs);
      }
    });
  }, CHAT_POLL_MS);
}

function stopChatPoll(){
  if(_chatPollTimer) clearInterval(_chatPollTimer);
  _chatPollTimer = null;
}

// ── Polling метаданных (онлайн/печатает) ──────────────
function startMetaPoll(chatId, onMeta){
  stopMetaPoll();
  _chatMetaTimer = setInterval(function(){
    loadChatMeta(chatId, function(meta){
      if(meta && onMeta) onMeta(meta);
    });
  }, CHAT_META_MS);
}

function stopMetaPoll(){
  if(_chatMetaTimer) clearInterval(_chatMetaTimer);
  _chatMetaTimer = null;
}

// ── Время «был в сети» ────────────────────────────────
function lastSeenText(ts){
  if(!ts) return '';
  var diff = Date.now() - ts;
  if(diff < 60000)    return 'только что';
  if(diff < 3600000)  return Math.floor(diff/60000) + ' мин. назад';
  if(diff < 86400000) return 'сегодня в ' + new Date(ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  return new Date(ts).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
}

// ── Загрузка файла на ImgBB ───────────────────────────
function uploadChatFile(file, onProgress, cb){
  var isImage = file.type.startsWith('image/');

  if(isImage && file.size < 5*1024*1024){
    // Изображения → ImgBB
    var reader = new FileReader();
    reader.onload = function(e){
      compressPhoto(e.target.result, function(b64){
        var clean = b64.replace(/^data:[^;]+;base64,/,'');
        var form  = new FormData();
        form.append('key', IMGBB_KEY);
        form.append('image', clean);
        if(onProgress) onProgress(50);
        fetch('https://api.imgbb.com/1/upload',{method:'POST',body:form})
          .then(function(r){return r.json();})
          .then(function(d){
            if(onProgress) onProgress(100);
            if(d&&d.success){
              cb(null, {url:d.data.display_url, thumb:d.data.thumb?d.data.thumb.url:d.data.display_url, name:file.name, type:'image'});
            } else {
              cb('ImgBB error', null);
            }
          })
          .catch(function(e){ cb(e.message, null); });
      });
    };
    reader.readAsDataURL(file);
  } else {
    // Другие файлы → base64 (до 1МБ) или ошибка
    if(file.size > 1024*1024){
      cb('Файл слишком большой. Максимум 1МБ для не-изображений.', null);
      return;
    }
    var reader2 = new FileReader();
    reader2.onload = function(e){
      if(onProgress) onProgress(100);
      cb(null, {
        url:   e.target.result,
        thumb: null,
        name:  file.name,
        type:  file.type.startsWith('video/') ? 'video' : 'file',
        size:  file.size,
      });
    };
    reader2.readAsDataURL(file);
  }
}

// ── Лайтбокс ─────────────────────────────────────────
function openLightbox(mediaList, startIndex){
  _lightboxMedia = mediaList;
  _lightboxIndex = startIndex || 0;
  _ensureLightbox();
  _renderLightbox();
  document.getElementById('lbx').style.display='flex';
  document.body.style.overflow='hidden';
}

function closeLightbox(){
  var lb = document.getElementById('lbx');
  if(lb) lb.style.display='none';
  document.body.style.overflow='';
  _lbxScale=1; _lbxRotate=0; _lbxX=0; _lbxY=0;
}

var _lbxScale=1, _lbxRotate=0, _lbxX=0, _lbxY=0;

function _ensureLightbox(){
  if(document.getElementById('lbx')) return;
  var div=document.createElement('div');
  div.id='lbx';
  div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;user-select:none';
  div.innerHTML=
    '<div style="position:absolute;top:14px;right:14px;display:flex;gap:8px;z-index:2">'+
      '<button onclick="_lbxRotate-=90;_applyLbx()" style="'+_lbxBtnStyle()+'">↺</button>'+
      '<button onclick="_lbxRotate+=90;_applyLbx()" style="'+_lbxBtnStyle()+'">↻</button>'+
      '<button onclick="_lbxScale=Math.max(.25,_lbxScale-.25);_applyLbx()" style="'+_lbxBtnStyle()+'">−</button>'+
      '<button onclick="_lbxScale=Math.min(4,_lbxScale+.25);_applyLbx()" style="'+_lbxBtnStyle()+'">+</button>'+
      '<button onclick="closeLightbox()" style="'+_lbxBtnStyle()+'">✕</button>'+
    '</div>'+
    '<button onclick="_lbxPrev()" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);'+_lbxBtnStyle()+'font-size:22px">‹</button>'+
    '<button onclick="_lbxNext()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);'+_lbxBtnStyle()+'font-size:22px">›</button>'+
    '<div id="lbx-content" style="max-width:90vw;max-height:85vh;overflow:hidden;display:flex;align-items:center;justify-content:center"></div>'+
    '<div id="lbx-counter" style="color:rgba(255,255,255,.5);font-size:12px;margin-top:12px"></div>';
  // Закрыть по Escape
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft') _lbxPrev();
    if(e.key==='ArrowRight') _lbxNext();
  });
  // Закрыть по клику на фон
  div.addEventListener('click',function(e){if(e.target===div)closeLightbox();});
  // Зум колесом
  div.addEventListener('wheel',function(e){
    e.preventDefault();
    _lbxScale=Math.max(.25,Math.min(4,_lbxScale-(e.deltaY>0?.2:-.2)));
    _applyLbx();
  });
  document.body.appendChild(div);
}

function _lbxBtnStyle(){
  return 'background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:14px;';
}

function _renderLightbox(){
  var m = _lightboxMedia[_lightboxIndex];
  if(!m) return;
  var el = document.getElementById('lbx-content');
  var ctr= document.getElementById('lbx-counter');
  _lbxScale=1;_lbxRotate=0;_lbxX=0;_lbxY=0;
  if(m.type==='image'){
    el.innerHTML='<img id="lbx-img" src="'+m.url+'" style="max-width:88vw;max-height:82vh;object-fit:contain;border-radius:8px;cursor:grab;transition:transform .2s" draggable="false">';
    _setupLbxDrag(document.getElementById('lbx-img'));
  } else if(m.type==='video'){
    el.innerHTML='<video src="'+m.url+'" controls style="max-width:88vw;max-height:82vh;border-radius:8px"></video>';
  } else {
    el.innerHTML='<div style="color:#fff;text-align:center;padding:40px"><div style="font-size:48px">📄</div><div style="margin-top:12px">'+m.name+'</div><a href="'+m.url+'" download="'+m.name+'" style="color:#60a5fa;margin-top:16px;display:block">⬇ Скачать</a></div>';
  }
  if(ctr) ctr.textContent = (_lightboxIndex+1)+' / '+_lightboxMedia.length;
}

function _applyLbx(){
  var img=document.getElementById('lbx-img');
  if(img) img.style.transform='rotate('+_lbxRotate+'deg) scale('+_lbxScale+') translate('+_lbxX+'px,'+_lbxY+'px)';
}

function _lbxPrev(){ if(_lightboxIndex>0){_lightboxIndex--;_renderLightbox();} }
function _lbxNext(){ if(_lightboxIndex<_lightboxMedia.length-1){_lightboxIndex++;_renderLightbox();} }

function _setupLbxDrag(img){
  var dragging=false,sx=0,sy=0,ox=0,oy=0;
  img.addEventListener('mousedown',function(e){dragging=true;sx=e.clientX-ox;sy=e.clientY-oy;img.style.cursor='grabbing';});
  document.addEventListener('mousemove',function(e){
    if(!dragging)return;
    _lbxX=(e.clientX-sx)/(_lbxScale||1)*_lbxScale;
    _lbxY=(e.clientY-sy)/(_lbxScale||1)*_lbxScale;
    ox=e.clientX-sx;oy=e.clientY-sy;
    _applyLbx();
  });
  document.addEventListener('mouseup',function(){dragging=false;if(img)img.style.cursor='grab';});
}
