// ═══════════════════════════════════════════════════════
//  CHAT ENGINE — Firebase Firestore
//
//  chats/{chatId}
//    .userId, .userEmail, .userName
//    .lastMsg, .lastTime, .unreadAdmin, .unreadUser
//    .userOnline, .userLastSeen, .userTyping, .adminTyping
//
//  chats/{chatId}/messages/{msgId}
//    .from ('user'|'admin'), .text, .time, .createdAt
//    .files [{url,name,type,thumb}]
//    .readByAdmin, .readByUser
// ═══════════════════════════════════════════════════════

var CHAT_TYPING_TIMEOUT = 3000;
var _chatId    = null;
var _chatRole  = null;
var _chatPollTimer = null;
var _chatMetaTimer = null;
var _typingTimer   = null;
var _lightboxMedia = [];
var _lightboxIndex = 0;

// ── Helpers ───────────────────────────────────────────
function _chatGET(){ return _h ? _h() : {}; }
function _chatPOST(){
  var h = {'Content-Type':'application/json'};
  var tok = (typeof _adminToken !== 'undefined' && _adminToken)
    ? _adminToken
    : (typeof getCurrentUser === 'function' && getCurrentUser() ? getCurrentUser().token : null);
  if(tok) h['Authorization'] = 'Bearer ' + tok;
  return h;
}

function _chatPatch(path, fields, cb){
  var mask = Object.keys(fields).map(function(k){ return 'updateMask.fieldPaths='+k; }).join('&');
  fetch(FS+'/'+path+'?'+mask, {
    method:'PATCH', headers:_chatPOST(), body:JSON.stringify({fields:fields})
  }).then(function(r){ return r.json(); })
    .then(function(d){ if(cb) cb(d.error ? null : d, d.error||null); })
    .catch(function(e){ if(cb) cb(null,e); });
}

function _chatSet(path, fields, cb){
  fetch(FS+'/'+path, {
    method:'PATCH', headers:_chatPOST(), body:JSON.stringify({fields:fields})
  }).then(function(r){ return r.json(); })
    .then(function(d){ if(cb) cb(d.error ? null : d, d.error||null); })
    .catch(function(e){ if(cb) cb(null,e); });
}

function _chatList(path, cb){
  fetch(FS+'/'+path, {headers:_chatGET()})
    .then(function(r){ return r.json(); })
    .then(function(d){ cb(d.documents || [], d.error||null); })
    .catch(function(e){ cb([], e); });
}

function _chatGet(path, cb){
  fetch(FS+'/'+path, {headers:_chatGET()})
    .then(function(r){ return r.json(); })
    .then(function(d){ cb(d.error ? null : d, d.error||null); })
    .catch(function(e){ cb(null,e); });
}

// ── ID чата ───────────────────────────────────────────
function getChatId(userId){ return 'chat_' + userId; }

// ── Инициализация чата пользователя ──────────────────
function initUserChat(user){
  _chatId   = getChatId(user.uid);
  _chatRole = 'user';
  _chatPatch('chats/'+_chatId, {
    userId:    {stringValue: user.uid},
    userEmail: {stringValue: user.email || ''},
    userName:  {stringValue: user.name  || user.email || ''},
    userOnline:   {booleanValue: true},
    userLastSeen: {integerValue: String(Date.now())},
  }, null);
  window.addEventListener('beforeunload', function(){ _markOnline(false); });
}

function _markOnline(online){
  if(!_chatId) return;
  _chatPatch('chats/'+_chatId, {
    userOnline:   {booleanValue: online},
    userLastSeen: {integerValue: String(Date.now())},
  }, null);
}

// ── Статус «печатает» ─────────────────────────────────
function setTyping(isTyping){
  if(!_chatId) return;
  var field  = _chatRole === 'user' ? 'userTyping' : 'adminTyping';
  var fields = {}; fields[field] = {booleanValue: isTyping};
  _chatPatch('chats/'+_chatId, fields, null);
}

// ── Отправить сообщение ───────────────────────────────
function sendChatMessage(text, files, cb){
  if(!_chatId) return;
  if(!text.trim() && (!files || !files.length)) return;
  var now   = Date.now();
  var msgId = 'msg_' + now + '_' + Math.random().toString(36).slice(2,6);
  var msg   = {
    from:        _chatRole,
    text:        text.trim(),
    createdAt:   now,
    time:        new Date(now).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),
    readByAdmin: _chatRole === 'admin',
    readByUser:  _chatRole === 'user',
    files:       files || [],
  };
  _chatSet('chats/'+_chatId+'/messages/'+msgId, objToFields(msg), function(doc, err){
    if(err){ console.error('sendChatMessage error:', err); return; }
    // Обновить мета чата
    var unreadField = _chatRole === 'user' ? 'unreadAdmin' : 'unreadUser';
    _chatGet('chats/'+_chatId, function(d){
      var cur = (d && d.fields && d.fields[unreadField]) ? parseInt(fsVal(d.fields[unreadField]))||0 : 0;
      var meta = {};
      meta.lastMsg     = {stringValue: text.trim() || (files&&files.length ? '📎 Файл' : '')};
      meta.lastTime    = {integerValue: String(now)};
      meta.userTyping  = {booleanValue: false};
      meta.adminTyping = {booleanValue: false};
      meta[unreadField]= {integerValue: String(cur+1)};
      _chatPatch('chats/'+_chatId, meta, null);
    });
    setTyping(false);
    if(cb) cb(msg, msgId);
  });
}

// ── Загрузить сообщения ───────────────────────────────
function loadChatMessages(chatId, cb){
  _chatList('chats/'+chatId+'/messages', function(docs, err){
    if(err){ if(cb)cb([]); return; }
    var msgs = docs.map(docToObj).filter(Boolean);
    msgs.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
    if(cb) cb(msgs);
  });
}

// ── Пометить прочитанным ─────────────────────────────
function markChatRead(chatId, role){
  var field = role === 'admin' ? 'unreadAdmin' : 'unreadUser';
  var f = {}; f[field] = {integerValue:'0'};
  _chatPatch('chats/'+chatId, f, null);
  var readField = role === 'admin' ? 'readByAdmin' : 'readByUser';
  _chatList('chats/'+chatId+'/messages', function(docs){
    docs.forEach(function(doc){
      var obj = docToObj(doc);
      if(obj && !obj[readField]){
        var id  = (doc.name||'').split('/').pop();
        var rf  = {}; rf[readField] = {booleanValue:true};
        _chatPatch('chats/'+chatId+'/messages/'+id, rf, null);
      }
    });
  });
}

// ── Загрузить все чаты (для админа) ──────────────────
function loadAllChats(cb){
  _chatList('chats', function(docs, err){
    if(err){ console.warn('loadAllChats error:', err); if(cb)cb([]); return; }
    var chats = docs.map(docToObj).filter(Boolean);
    chats.sort(function(a,b){ return (b.lastTime||0)-(a.lastTime||0); });
    if(cb) cb(chats);
  });
}

// ── Мета чата ────────────────────────────────────────
function loadChatMeta(chatId, cb){
  _chatGet('chats/'+chatId, function(doc, err){
    if(cb) cb(err ? null : docToObj(doc));
  });
}

// ── Polling ──────────────────────────────────────────
function startChatPoll(chatId, role, onNew){
  stopChatPoll();
  var lastCount = 0;
  _chatPollTimer = setInterval(function(){
    loadChatMessages(chatId, function(msgs){
      if(msgs.length > lastCount){
        var newMsgs = msgs.slice(lastCount);
        lastCount = msgs.length;
        if(onNew) onNew(newMsgs, msgs);
      }
    });
  }, 2000);
}
function stopChatPoll(){ clearInterval(_chatPollTimer); _chatPollTimer=null; }

function startMetaPoll(chatId, onMeta){
  stopMetaPoll();
  _chatMetaTimer = setInterval(function(){
    loadChatMeta(chatId, function(m){ if(m&&onMeta) onMeta(m); });
  }, 3000);
}
function stopMetaPoll(){ clearInterval(_chatMetaTimer); _chatMetaTimer=null; }

// ── Время «был в сети» ────────────────────────────────
function lastSeenText(ts){
  if(!ts) return '';
  var diff = Date.now()-ts;
  if(diff < 60000)    return 'только что';
  if(diff < 3600000)  return Math.floor(diff/60000)+' мин. назад';
  if(diff < 86400000) return 'сегодня в '+new Date(ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  return new Date(ts).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
}

// ── Загрузка файла на ImgBB ───────────────────────────
function uploadChatFile(file, onProgress, cb){
  var isImage = file.type.startsWith('image/');
  if(isImage && file.size < 5*1024*1024){
    var reader = new FileReader();
    reader.onload = function(e){
      compressPhoto(e.target.result, function(b64){
        var clean = b64.split(',')[1] || b64;
        var form  = new FormData();
        form.append('key',   IMGBB_KEY);
        form.append('image', clean);
        if(onProgress) onProgress(50);
        fetch('https://api.imgbb.com/1/upload',{method:'POST',body:form})
          .then(function(r){return r.json();})
          .then(function(d){
            if(onProgress) onProgress(100);
            if(d&&d.success){
              cb(null,{url:d.data.display_url,thumb:d.data.thumb?d.data.thumb.url:d.data.display_url,name:file.name,type:'image'});
            } else {
              cb('ImgBB error',null);
            }
          }).catch(function(e){cb(e.message,null);});
      });
    };
    reader.readAsDataURL(file);
  } else {
    if(file.size > 1024*1024){ cb('Максимум 1МБ для не-изображений',null); return; }
    var r2 = new FileReader();
    r2.onload = function(e){
      if(onProgress) onProgress(100);
      cb(null,{url:e.target.result,thumb:null,name:file.name,type:file.type.startsWith('video/')?'video':'file',size:file.size});
    };
    r2.readAsDataURL(file);
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
  var lb=document.getElementById('lbx');
  if(lb) lb.style.display='none';
  document.body.style.overflow='';
  _lbxScale=1;_lbxRotate=0;
}
var _lbxScale=1,_lbxRotate=0;
function _lbxBtnSt(){ return 'background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:14px;'; }
function _ensureLightbox(){
  if(document.getElementById('lbx')) return;
  var div=document.createElement('div');
  div.id='lbx';
  div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;user-select:none';
  div.innerHTML=
    '<div style="position:absolute;top:14px;right:14px;display:flex;gap:8px;z-index:2">'+
      '<button onclick="_lbxRotate-=90;_applyLbx()" style="'+_lbxBtnSt()+'">↺</button>'+
      '<button onclick="_lbxRotate+=90;_applyLbx()" style="'+_lbxBtnSt()+'">↻</button>'+
      '<button onclick="_lbxScale=Math.max(.25,_lbxScale-.25);_applyLbx()" style="'+_lbxBtnSt()+'">−</button>'+
      '<button onclick="_lbxScale=Math.min(4,_lbxScale+.25);_applyLbx()" style="'+_lbxBtnSt()+'">+</button>'+
      '<button onclick="closeLightbox()" style="'+_lbxBtnSt()+'">✕</button>'+
    '</div>'+
    '<button onclick="_lbxPrev()" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);'+_lbxBtnSt()+'font-size:22px">‹</button>'+
    '<button onclick="_lbxNext()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);'+_lbxBtnSt()+'font-size:22px">›</button>'+
    '<div id="lbx-content" style="max-width:90vw;max-height:85vh;display:flex;align-items:center;justify-content:center"></div>'+
    '<div id="lbx-counter" style="color:rgba(255,255,255,.5);font-size:12px;margin-top:12px"></div>';
  div.addEventListener('click',function(e){if(e.target===div)closeLightbox();});
  div.addEventListener('wheel',function(e){
    e.preventDefault();
    _lbxScale=Math.max(.25,Math.min(4,_lbxScale-(e.deltaY>0?.2:-.2)));
    _applyLbx();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')closeLightbox();
    if(e.key==='ArrowLeft')_lbxPrev();
    if(e.key==='ArrowRight')_lbxNext();
  });
  document.body.appendChild(div);
}
function _renderLightbox(){
  var m=_lightboxMedia[_lightboxIndex];
  if(!m) return;
  var el=document.getElementById('lbx-content');
  var ct=document.getElementById('lbx-counter');
  _lbxScale=1;_lbxRotate=0;
  if(m.type==='image'){
    el.innerHTML='<img id="lbx-img" src="'+m.url+'" style="max-width:88vw;max-height:82vh;object-fit:contain;border-radius:8px;cursor:grab" draggable="false">';
  } else if(m.type==='video'){
    el.innerHTML='<video src="'+m.url+'" controls style="max-width:88vw;max-height:82vh;border-radius:8px"></video>';
  } else {
    el.innerHTML='<div style="color:#fff;text-align:center;padding:40px"><div style="font-size:48px">📄</div><div style="margin-top:12px">'+(m.name||'файл')+'</div><a href="'+m.url+'" download style="color:#60a5fa;margin-top:16px;display:block">⬇ Скачать</a></div>';
  }
  if(ct) ct.textContent=(_lightboxIndex+1)+' / '+_lightboxMedia.length;
}
function _applyLbx(){ var img=document.getElementById('lbx-img'); if(img) img.style.transform='rotate('+_lbxRotate+'deg) scale('+_lbxScale+')'; }
function _lbxPrev(){ if(_lightboxIndex>0){_lightboxIndex--;_renderLightbox();} }
function _lbxNext(){ if(_lightboxIndex<_lightboxMedia.length-1){_lightboxIndex++;_renderLightbox();} }
