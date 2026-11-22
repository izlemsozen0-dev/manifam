/* MANIFAM — no-build portable release. All matching, chat, vote and stats data is real Supabase data. */
const root = document.getElementById('app');
const MEMBERS = [
  {id:'sueda',name:'Sueda',emoji:'🌸',tone:'green',color:'#a4d5b1'},
  {id:'hilal',name:'Hilal',emoji:'🌙',tone:'purple',color:'#c7acf2'},
  {id:'zeynep',name:'Zeynep',emoji:'⭐',tone:'blue',color:'#aed4f7'},
  {id:'esin',name:'Esin',emoji:'🌿',tone:'yellow',color:'#ffe382'},
  {id:'mina',name:'Mina',emoji:'🍓',tone:'red',color:'#f5a5a6'},
  {id:'lidya',name:'Lidya',emoji:'🦋',tone:'pink',color:'#f4acdc'},
];
const QUESTIONS = [
  {id:'favorite',prompt:'En sevdiğin Manifest üyesi kim?',hint:'kalbini kime kaptırdın ♥',options:['sueda','hilal','lidya','mina','esin','zeynep']},
  {id:'leastFavorite',prompt:'Tamam dürüst ol... en az sevdiğin kim?',hint:'dert değil, sadece merak ~',options:['sueda','hilal','lidya','mina','esin','zeynep']},
  {id:'backup',prompt:'Favorin gruptan ayrılsa kimi desteklerdin?',hint:'yedek bias ~',options:['sueda','hilal','lidya','mina','esin','zeynep']},
  {id:'matchMode',prompt:'Kiminle konuşmak istersin?',hint:'ikizini mi yoksa zıtını mı arıyorsun',options:['same','opposite']},
];
const PRESET_MESSAGES = [
  'Selam! En sevdiğin Manifest şarkısı hangisi?',
  'Favori performansın hangisi?',
  'Benim favorim çok enerjik!',
  'Sence en eğlenceli sahne hangisiydi?',
  'Grubun hangi şarkısını önerirsin?',
  'Bence bütün üyeler çok yetenekli.',
  'Aynı fikirdeyim!',
  'Farklı düşünüyoruz ama saygı duyuyorum.',
  'Bu sohbet çok keyifli!',
  'Teşekkürler, görüşürüz!',
];
const REPORT_REASONS=['Rahatsız edici mesaj','Spam','Kurallara aykırı davranış','Diğer'];
const BUCKETS=['0-25','25-50','50-75','75-100'];
const ADJECTIVES=['Brat','Minnoş','Yaramaz','Pembe','Mavi','Yeşil','Tatlı','Uslu','Çılgın','Küçük','Sevimli','Hızlı','Uykulu','Neşeli','Sakin','Şirin'];
const FAN_WORDS=['Manifest','Mani','Fest','Stanifest','Fandom','Bias','Stan','Sueda','Hilal','Zeynep','Esin','Mina','Lidya'];
const ANIMALS=[['Tavşan','🐰'],['Kedi','🐱'],['Tilki','🦊'],['Kurbağa','🐸'],['Panda','🐼'],['Kirpi','🦔'],['Baykuş','🦉'],['Arı','🐝'],['Kelebek','🦋'],['Hamster','🐹'],['Ördek','🦆'],['Penguen','🐧'],['Koala','🐨'],['Sincap','🐿️']];
const STORE = 'manifam_public_connection_v1';
let client=null;
let config=null;
let intervals=[];
let channels=[];
const st={ page:'boot',nickname:null,answers:{},questionIndex:0,profile:null,room:null,endedRoom:null,
  messages:[],selectedMessage:'',selectedBucket:'',feedbackTarget:'',feedbackSaved:false,
  reportReason:REPORT_REASONS[0],reportOpen:false,reportSent:false,stats:null,
  busy:false,matchingBusy:false,searching:false,err:'',notice:'',serverOffset:0};

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const member=id=>MEMBERS.find(m=>m.id===id)||MEMBERS[0];
const random=a=>a[Math.floor(Math.random()*a.length)];
const btn=(label,action,kind='green',extra='')=>`<button type="button" class="btn ${kind} ${extra}" data-action="${esc(action)}">${label}</button>`;
const frame=(title,inner)=>`<section class="window"><div class="window-bar"><span class="window-name">▣ ${esc(title)}</span><span class="controls" aria-hidden="true"><i></i><i></i><i></i></span></div><div class="window-content">${inner}</div></section>`;
const messages=()=>`${st.err?`<div role="alert" class="notice error">⚠ ${esc(st.err)}</div>`:''}${st.notice?`<div role="status" class="notice success">✓ ${esc(st.notice)}</div>`:''}`;
const footer=`<div class="footer-tape">★ maniFAM.exe • anonim • nazik ol ★</div><p class="desktop-foot">Hayran yapımı topluluk • kişisel bilgi paylaşma</p>`;
const roomTimerText=()=>{if(!st.room?.expiresAt)return '--:--';const t=Math.max(0,Math.ceil((new Date(st.room.expiresAt).getTime()-Date.now()-st.serverOffset)/1000));return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`};
function render(){
  let body='';
  if(st.page==='setup') body=setupView();
  else if(st.page==='home') body=homeView();
  else if(st.page==='nickname') body=nicknameView();
  else if(st.page==='quiz') body=quizView();
  else if(st.page==='results') body=resultsView();
  else if(st.page==='matching') body=matchingView();
  else if(st.page==='room') body=roomView();
  else if(st.page==='feedback') body=feedbackView();
  else if(st.page==='stats') body=statsView();
  else body=frame('maniFAM.exe',`<p class="center">Bağlanılıyor...</p>`);
  root.innerHTML=body+footer;
  if(st.page==='room'){const b=document.getElementById('chat-messages');if(b)b.scrollTop=b.scrollHeight;}
}
function setupView(){return frame('kurulum.exe — ilk bağlantı',`<div class="stack">
  <h1 class="center">maniFAM<span>.exe</span></h1>
  <p class="center">Bolt'a ihtiyaç yok! Kendi Supabase hesabınla bu siteyi bağlayabilirsin.</p>
  <div class="card stack-sm"><h3>1 · Supabase proje URL'si</h3><input class="field" id="project-url" type="url" autocapitalize="none" spellcheck="false" placeholder="https://xxxxx.supabase.co" value="${esc(config?.url||'')}" />
  <h3>2 · Publishable Key</h3><input class="field" id="public-key" type="text" autocapitalize="none" spellcheck="false" placeholder="sb_publishable_..." value="${esc(config?.key||'')}" />
  <p class="tiny muted">Sadece Project URL ve publishable key. Secret / service_role anahtarını ASLA yazma.</p></div>
  ${messages()}${btn(st.busy?'Bağlanıyor...':'Bağlantıyı Test Et ve Kaydet','save-config','pink full big')}
  <p class="small muted">İlk kurulumdan sonra sana paylaşılabilir bir bağlantı oluşturulacak. Diğer kullanıcılar aynı Supabase veritabanına bağlanacak.</p>
  </div>`);}
function homeView(){return frame('maniFAM.exe — karşılama',`<div class="stack center">
  <div><h1>maniFAM<span>.exe</span></h1><p class="subtitle"><b>Manifest</b> hayranları için internetin minik bir köşesi ♥</p></div>
  <div class="hero-emoji"><span class="bob">🦋</span> 💗 ✨</div>
  <p>Rastgele takma ad al, <b>4 soruluk</b> testi çöz, sonra gerçek hayranlarla güvenli hazır mesajlarla sohbet et.</p>
  <div class="pills">${MEMBERS.map(m=>`<span class="pill ${m.tone}-tile">${m.emoji} ${m.name}</span>`).join('')}</div>
  ${messages()}
  <div class="stack-sm">${btn('Fanmily\'e Katıl >>','join','green full big')}${btn('SONUÇLAR / İstatistikler','stats','ghost full')}</div>
  ${st.profile?`<div class="notice">Daha önce testi tamamladın: ${esc(st.profile.emoji)} ${esc(st.profile.nickname)}<div style="margin-top:9px">${btn('Profilime dön','results','purple full')}</div></div>`:''}
  <button class="linklike" data-action="share">⋆ Siteyi paylaş / bağlantı ayarları</button>
  <p class="tiny muted">E-posta veya telefon gerekmez. Gerçek isim, adres, okul ya da sosyal medya bilgisi paylaşma.</p>
</div>`)+`<div class="footer-tape">★ maniFAM.exe'ye hoş geldin ★ • 2003 ruhunda • anonimsin</div>`;}
function nicknameView(){return frame('takmaad.exe — rastgele üreteç',`<div class="stack center">
  <h2>Gizli kimliğin için zar at</h2><p>Manifest fandom sözlerini sevimli hayvanlarla karıştırıyoruz.</p>
  <div class="card stack-sm" style="min-height:106px;justify-content:center">${st.nickname?`<div style="font-size:34px">${esc(st.nickname.emoji)}</div><h2 style="color:#8351b4">${esc(st.nickname.text)}</h2>`:'<p class="muted">Başlamak için zara dokun_</p>'}</div>
  ${messages()}<div class="stack-sm">${btn(st.nickname?'Tekrar zar at':'Zar At 🎲','roll','purple full big')}${btn('Bunu Sev & Devam Et >>','quiz-start','green full')}${btn('<< geri','home','ghost full small')}</div></div>`);}
function quizView(){const q=QUESTIONS[st.questionIndex];const val=st.answers[q.id];return frame(`test.exe — s${st.questionIndex+1}/${QUESTIONS.length}`,`<div class="stack">
  <div class="progress-dots">${QUESTIONS.map((_,i)=>`<span class="${i<st.questionIndex?'done':i===st.questionIndex?'active':''}"></span>`).join('')}</div>
  <p class="center muted small">sen ${esc(st.nickname?.emoji)} <b>${esc(st.nickname?.text)}</b>'sin</p>
  <div class="center"><h2>${esc(q.prompt)}</h2><p class="muted">${esc(q.hint)}</p></div>
  <div class="${q.id==='matchMode'?'stack-sm':'choice-grid'}">${q.options.map(id=>{const m=q.id==='matchMode'?null:member(id);const label=m?m.name:id==='same'?'👯 Benimle aynı düşünen biri':'🧲 Benimle zıt düşünen biri';return `<button type="button" data-choice="${esc(id)}" class="choice ${q.id==='matchMode'?'wide':''} ${m?m.tone+'-tile':id==='same'?'green-tile':'purple-tile'} ${val===id?'selected':''}">${m?`<span class="emoji">${m.emoji}</span>`:''}<span>${esc(label)}</span>${val===id?'<b>★</b>':''}</button>`}).join('')}</div>
  ${messages()}<div class="buttons">${btn('<< geri','quiz-back','ghost')}${btn(st.busy?'Kaydediliyor...':st.questionIndex===3?'Sonuçlarımı Göster ♥':'Sonraki Soru','quiz-next',st.questionIndex===3?'pink':'green')}</div></div>`);}
function resultsView(){if(!st.profile||!st.answers.favorite)return frame('profil.exe','<p>Önce testi tamamla.</p>'+btn('Başla','join'));const fav=member(st.answers.favorite);return frame('sonuç.exe — manifest profilin',`<div class="stack center">
  <div><p class="small muted">${esc(st.nickname?.emoji)} ${esc(st.nickname?.text)}</p><h2>manifest profilin</h2></div>
  <div class="card ${fav.tone}-tile"><div style="font-size:40px">${fav.emoji}</div><h2 style="color:#261b20">${fav.name.toUpperCase()} STAN</h2><p>${fav.name} stan, yedek ${member(st.answers.backup).name}</p></div>
  <span class="stamp">♥ ${fav.name} / ✗ ${member(st.answers.leastFavorite).name} / ♻ ${member(st.answers.backup).name}</span>
  <div class="table-wrap"><div class="title-ribbon">GÖRÜŞ ÖZETİ</div><table><tbody>
    <tr><td>♥ favori</td><td>${fav.name}</td></tr><tr><td>✕ en az</td><td>${member(st.answers.leastFavorite).name}</td></tr>
    <tr><td>♻ yedek</td><td>${member(st.answers.backup).name}</td></tr><tr><td>☻ aranan</td><td>${st.answers.matchMode==='same'?'aynı görüş':'zıt görüş'}</td></tr>
  </tbody></table></div>
  <div class="notice">Gerçek eşleşme bekleniyor. Sahte kullanıcı veya demo sohbet yok.</div>${messages()}
  <div class="stack-sm">${btn('Hadi Eşleşelim! >>','start-match','pink full big')}<div class="buttons">${btn('Testi Tekrar Çöz','quiz-start','ghost')}${btn('Ana Sayfa','home','ghost')}</div></div></div>`);}
function matchingView(){return frame('sohbet.exe — güvenli lobi',`<div class="stack center"><div class="card">${esc(st.nickname?.emoji)} ${esc(st.nickname?.text)}</div>
  <div class="hero-emoji"><span class="bob">💗</span> 🦋 ✨</div>
  <h2>Manifam aranıyor...</h2><p class="muted">${st.searching?'Gerçek bir kullanıcı bekleniyor. Henüz eşleşme yok.':'Kuyruğa bağlanılıyor...'}</p>
  <div class="loader"><div></div></div><p class="small muted">Yalnızca gerçek kullanıcılar eşleştirilir. Uygun kimse yoksa bu ekranda kalırsın.</p>
  <p class="tiny muted">Güvenli hazır mesajlar · kişisel bilgi yok · 15 dakikalık sohbet · bildir & engelle</p>
  ${messages()}<div class="buttons">${btn('Aramayı İptal Et','cancel-match','ghost')}${btn('Tekrar Dene','retry-match','green')}</div></div>`);}
function roomView(){const r=st.room;if(!r?.partner)return frame('sohbet.exe','<p>Oda bilgisi alınamadı.</p>');const p=member(r.partner.favorite),own=member(st.answers.favorite);const header=own.id===p.id?own.color:`linear-gradient(100deg,${own.color},${p.color})`;const style=own.id===p.id?`background:${own.color}`:`background:${header}`;return frame('sohbet.exe — güvenli lobi',`<div class="stack">
  <div class="card paper row spread"><span>${esc(st.nickname?.emoji)} ${esc(st.nickname?.text)}</span><small>#${esc(st.profile?.id.slice(0,6))}</small></div>
  <div class="timer">⏱ <span id="countdown">${roomTimerText()}</span> / 15:00</div>
  <div class="chat-head" style="${style}"><span>${esc(r.partner.emoji)} <b>${esc(r.partner.nickname)}</b></span><span class="small">♥ ${p.name}</span></div>
  <div class="chatbox" id="chat-messages">${st.messages.length?st.messages.map(msg=>`<div class="bubble ${msg.senderId===st.profile?.id?'mine':'theirs'}" style="background:${msg.senderId===st.profile?.id?own.color:p.color}">${esc(msg.body)}</div>`).join(''):'<p class="center muted small" style="margin:auto">İlk hazır mesajı seç!_</p>'}</div>
  <div class="stack-sm"><label class="small" for="preset-message">Hazır mesaj seç (serbest yazışma kapalı):</label>
  <select id="preset-message" class="field"><option value="">Mesaj seç...</option>${PRESET_MESSAGES.map(m=>`<option value="${esc(m)}" ${st.selectedMessage===m?'selected':''}>${esc(m)}</option>`).join('')}</select>${btn(st.busy?'Gönderiliyor...':'Gönder','send-message','green full')}
  </div>${messages()}<div class="buttons">${btn('Sohbeti Bitir','end-room','red')}${btn('Bildir','toggle-report','ghost')}${btn('Engelle','block-user','ghost')}</div>
  ${st.reportOpen?`<div class="card stack-sm"><label for="report-reason">Bildirim nedeni</label><select id="report-reason" class="field">${REPORT_REASONS.map(m=>`<option ${st.reportReason===m?'selected':''}>${esc(m)}</option>`).join('')}</select>${btn(st.reportSent?'Bildirim kaydedildi':'Bildirimi Gönder','report-user','red full')}</div>`:''}
  <p class="tiny muted center">Kişisel bilgi paylaşma. Bildirimler incelenmek üzere kaydedilir; canlı insan moderasyonu henüz aktif değildir.</p></div>`);}
function feedbackView(){return frame('degerlendirme.exe — gizli',`<div class="stack center">
  <h2>Sohbet sonrası değerlendirme</h2><p class="small muted">Cevabın karşı tarafa gösterilmez. Her sohbet için yalnızca bir oy.</p>
  ${st.feedbackSaved?`<div class="card">💗 Değerlendirmen kaydedildi!</div>${btn('Yeni Eşleşme','start-match','green full')}${btn('İstatistikleri Gör','stats','ghost full')}${btn('Ana Sayfa','home','ghost full')}`:
  `<div class="card">Karşı tarafın favorisi: <b>${st.feedbackTarget?member(st.feedbackTarget).name:'Yükleniyor...'}</b></div>
  <h3>Karşı tarafın savunduğu Manifest üyesine karşı samimiyetiniz ne kadar arttı?</h3>
  <div class="choice-grid">${BUCKETS.map(b=>`<button type="button" data-bucket="${b}" class="choice green-tile ${st.selectedBucket===b?'selected':''}">%${b}</button>`).join('')}</div>
  ${messages()}${btn(st.busy?'Gönderiliyor...':'Değerlendirmeyi Gönder','submit-feedback','pink full big')}`}
  </div>`);}
function statsView(){const rows=st.stats||[];const total=rows.reduce((a,v)=>a+v.total,0);return frame('istatistik.exe — topluluk',`<div class="stack">
  <div class="center"><h2>Topluluk İstatistikleri</h2><p class="small muted">Tüm cihazlarda ortak · yalnızca gerçek değerlendirmeler</p></div>
  ${messages()}
  ${st.stats===null?(st.err?'<p class="center muted">Gerçek sonuçlar şu anda görüntülenemiyor.</p>':'<p class="center muted">Veritabanından okunuyor...</p>'):`<div class="table-wrap"><div class="title-ribbon">SAMİMİYET ARTIŞI DAĞILIMI</div><table><thead><tr><th>Üye</th><th>Oy</th>${BUCKETS.map(b=>`<th>%${b}</th>`).join('')}</tr></thead>
  <tbody>${MEMBERS.map(m=>{const row=rows.find(x=>x.id===m.id)||{total:0,counts:{}};return `<tr><td><b>${m.emoji} ${m.name}</b></td><td>${row.total}</td>${BUCKETS.map(b=>`<td>${row.counts[b]||0}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>
  ${total===0?'<div class="notice center">Henüz değerlendirme yok.</div>':''}
  <div class="card paper stack-sm"><h3>Yüzdelik dağılım (üye bazında)</h3>${MEMBERS.map(m=>{const row=rows.find(x=>x.id===m.id)||{total:0,counts:{}};return `<div class="stats-row"><div class="member-count"><span>${m.emoji} ${m.name}</span><span>${row.total} oy</span></div><div class="bar">${BUCKETS.map((b,i)=>`<span style="background:${m.color};opacity:${.35+i*.20};width:${row.total?(row.counts[b]||0)/row.total*100:0}%" title="%${b}: ${row.counts[b]||0}"></span>`).join('')}</div><div class="tiny muted">${BUCKETS.map(b=>`%${b}: ${row.total?Math.round((row.counts[b]||0)/row.total*100):0}%`).join(' · ')}</div></div>`}).join('')}</div><p class="center small muted">Toplam ${total} gerçek değerlendirme.</p>`}
  <div class="buttons">${btn('<< Ana Sayfa','home','ghost')}${btn('Eşleş >>','start-match','green')}</div></div>`);}

function validateConfig(c){
  if(!c?.url||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.url.trim()))throw Error('Project URL geçersiz. https://xxxxx.supabase.co biçiminde olmalı.');
  if(!c?.key || !/^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/.test(c.key.trim()))throw Error('Yalnızca publishable key veya eski anon public key kullanılabilir. Secret key girme.');
  return {url:c.url.trim().replace(/\/$/,''),key:c.key.trim()};
}
async function loadClient(c){const checked=validateConfig(c);if(client&&config?.url===checked.url&&config?.key===checked.key)return client;
  let mod;try{mod=await import('https://esm.sh/@supabase/supabase-js@2.57.4?bundle');}
  catch(e){try{mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');}catch(e2){throw Error('Supabase kitaplığı yüklenemedi. İnternetini kontrol et: '+String(e2?.message||e2));}}
  client=mod.createClient(checked.url,checked.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});config=checked;return client;
}
async function ensureSession(){const {data,error}=await client.auth.getUser();if(data?.user)return data.user;
  if(error&&!/session missing|auth session missing/i.test(error.message))throw Error(error.message);
  const r=await client.auth.signInAnonymously();if(r.error)throw Error('Anonim oturum açılamadı: '+r.error.message);if(!r.data.user)throw Error('Anonim oturum oluşturulamadı.');return r.data.user;
}
async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw Error(`${name}: ${error.message}`);return data;}
async function query(table,fields='*'){const {data,error}=await client.from(table).select(fields);if(error)throw Error(`${table}: ${error.message}`);return data||[];}
function stopLive(){intervals.forEach(clearInterval);intervals=[];channels.forEach(ch=>{try{void client?.removeChannel(ch);}catch{}});channels=[];st.searching=false;}
function timer(fn,ms){const id=setInterval(fn,ms);intervals.push(id);return id;}
function subscribe(name,table,filter,handler){try{const ch=client.channel(name).on('postgres_changes',{event:'*',schema:'public',table,...(filter?{filter}:{})},handler).subscribe();channels.push(ch);}catch(e){st.notice='Canlı bağlantı kullanılamıyor; düzenli kontroller devam ediyor.';}}
function navigate(page){if(st.page==='room'&&page!=='room'&&page!=='feedback')return;stopLive();st.page=page;st.err='';st.notice='';render();if(page==='stats')void fetchStats();}
function makeNickname(){const a=random(ANIMALS);return {text:`${random(Math.random()<.4?FAN_WORDS:ADJECTIVES)} ${a[0]}`,emoji:a[1]};}
function startQuiz(){if(!st.nickname){st.err='Önce zar atıp takma ad al.';render();return;}st.answers={};st.questionIndex=0;navigate('quiz');}
async function finishQuiz(){if(st.busy)return;const q=QUESTIONS[st.questionIndex];if(!st.answers[q.id]){st.err='Lütfen bir cevap seç.';render();return;}
  if(st.questionIndex<QUESTIONS.length-1){st.questionIndex++;st.err='';render();return;}
  const a=st.answers;st.busy=true;st.err='';render();
  try{const user=await ensureSession();const profile=await rpc('create_profile',{p_nickname:st.nickname.text,p_emoji:st.nickname.emoji,p_favorite:a.favorite,p_least_favorite:a.leastFavorite,p_backup:a.backup,p_match_mode:a.matchMode});
    if(!profile?.id||profile.id!==user.id)throw Error('Profil veritabanına kaydedilemedi.');st.profile=profile;navigate('results');}
  catch(e){st.err=String(e.message||e);}finally{st.busy=false;render();}}
async function findRoom(){const d=await rpc('get_my_room');const row=d?.[0];if(!row?.out_room_id)return null;return {roomId:row.out_room_id,expiresAt:row.out_expires_at,partner:{id:row.out_partner_id,nickname:row.out_partner_nickname,emoji:row.out_partner_emoji,favorite:row.out_partner_favorite},serverTime:row.out_server_time};}
async function tickMatch(){if(st.page!=='matching'||st.matchingBusy)return;st.matchingBusy=true;
  try{const id=await rpc('match_profile');if(id){const room=await findRoom();if(room?.roomId){enterRoom(room);return;}}}
  catch(e){stopLive();st.err=String(e.message||e);st.searching=false;render();}
  finally{st.matchingBusy=false;}}
async function beginMatching(){if(!st.profile){navigate('nickname');return;}stopLive();st.page='matching';st.err='';st.searching=true;st.room=null;render();
  subscribe(`my-match-${st.profile.id}`,'profiles',`id=eq.${st.profile.id}`,e=>{if(e.new?.status==='in_room')void findRoom().then(room=>{if(room&&st.page==='matching')enterRoom(room);}).catch(err=>{st.err=err.message;render();});});
  timer(()=>void tickMatch(),2500);await tickMatch();}
function enterRoom(room){stopLive();st.room=room;st.serverOffset=new Date(room.serverTime).getTime()-Date.now();st.messages=[];st.selectedMessage='';st.page='room';st.err='';render();
  void loadMessages();subscribe(`room-msg-${room.roomId}`,'messages',`room_id=eq.${room.roomId}`,()=>void loadMessages());
  timer(()=>void loadMessages(),4500);
  timer(()=>{if(st.page!=='room')return;const seconds=Math.ceil((new Date(room.expiresAt).getTime()-Date.now()-st.serverOffset)/1000);const el=document.getElementById('countdown');if(el)el.textContent=roomTimerText();if(seconds<=0)finishRoom(false);},1000);
  timer(()=>void rpc('room_active',{p_room:room.roomId}).then(active=>{if(!active&&st.page==='room')finishRoom(false);}).catch(e=>{st.err=e.message;render();}),6000);
}
async function loadMessages(){if(st.page!=='room'||!st.room)return;const {data,error}=await client.from('messages').select('id,sender_id,body,created_at').eq('room_id',st.room.roomId).order('created_at',{ascending:true});
  if(error){st.err=error.message;render();return;}const mapped=(data||[]).map(v=>({id:v.id,senderId:v.sender_id,body:v.body,createdAt:v.created_at}));
  if(JSON.stringify(mapped.map(x=>x.id))!==JSON.stringify(st.messages.map(x=>x.id))){st.messages=mapped;render();}}
async function finishRoom(manual){if(st.page!=='room'||!st.room)return;const id=st.room.roomId;if(manual){st.busy=true;render();try{await rpc('end_room',{p_room:id});}catch(e){st.err=e.message;st.busy=false;render();return;}st.busy=false;}
  stopLive();st.endedRoom=id;st.room=null;st.page='feedback';st.selectedBucket='';st.feedbackSaved=false;st.feedbackTarget='';st.err='';render();void fetchFeedbackTarget();}
async function fetchFeedbackTarget(){if(!st.endedRoom)return;try{const target=await rpc('get_feedback_target',{p_room:st.endedRoom});if(target){st.feedbackTarget=target;render();}}catch(e){st.err=e.message;render();}}
async function sendMessage(){if(st.busy||!st.selectedMessage||!st.room)return;if(!PRESET_MESSAGES.includes(st.selectedMessage)){st.err='Sadece hazır mesaj seç.';render();return;}
  st.busy=true;st.err='';render();try{await rpc('send_message',{p_room:st.room.roomId,p_body:st.selectedMessage});st.selectedMessage='';await loadMessages();}
  catch(e){st.err=e.message;}finally{st.busy=false;render();}}
async function reportUser(){if(!st.room||st.reportSent)return;st.busy=true;try{await rpc('insert_report',{p_room:st.room.roomId,p_reason:st.reportReason});st.reportSent=true;st.notice='Bildirimin kaydedildi.';}catch(e){st.err=e.message;}finally{st.busy=false;render();}}
async function blockUser(){if(!st.room?.partner?.id)return;st.busy=true;try{await rpc('insert_block',{p_blocked:st.room.partner.id});await rpc('end_room',{p_room:st.room.roomId});st.busy=false;stopLive();st.endedRoom=st.room.roomId;st.room=null;st.page='feedback';st.feedbackSaved=false;st.feedbackTarget='';st.err='';render();void fetchFeedbackTarget();}catch(e){st.err=e.message;st.busy=false;render();}}
async function submitFeedback(){if(st.busy||!st.endedRoom||!st.feedbackTarget||!BUCKETS.includes(st.selectedBucket)){st.err='Lütfen bir aralık seç.';render();return;}
  st.busy=true;st.err='';render();try{await rpc('submit_feedback',{p_room:st.endedRoom,p_bucket:st.selectedBucket});st.feedbackSaved=true;st.notice='Değerlendirmen ortak istatistiklere gönderildi.';}catch(e){st.err=e.message;}finally{st.busy=false;render();}}
async function fetchStats(){try{const [a,b]=await Promise.all([query('stats_member_appreciation'),query('stats_member_buckets')]);st.stats=MEMBERS.map(m=>{const counts=Object.fromEntries(BUCKETS.map(x=>[x,0]));b.filter(v=>v.member===m.id).forEach(v=>{if(BUCKETS.includes(v.bucket))counts[v.bucket]=Number(v.count)});return {id:m.id,total:Number(a.find(v=>v.member===m.id)?.feedback_count||0),counts};});st.err='';render();}
  catch(e){st.err='İstatistikler yüklenemedi: '+e.message;st.stats=null;render();}}
async function showStats(){navigate('stats');subscribe('community-stats','stats_version','id=eq.1',()=>void fetchStats());timer(()=>void fetchStats(),30000);}
function shareUrl(){if(!config)return'';const p=new URLSearchParams({project:config.url,key:config.key});return `${location.origin}${location.pathname}#${p.toString()}`;}
function shareView(){if(!config){navigate('setup');return;}stopLive();st.page='share';const url=shareUrl();root.innerHTML=frame('paylaş.exe — bağlantı',`<div class="stack"><h2 class="center">MANIFAM'ı Paylaş</h2><p class="small">Aşağıdaki bağlantıyı arkadaşlarına gönderebilirsin. Bağlantıyı açan herkes aynı Supabase veritabanını kullanır.</p><input class="field link-field" readonly id="share-url" value="${esc(url)}" />
  <div class="buttons">${btn('Bağlantıyı Kopyala','copy-url','pink')}${btn('Ana Sayfa','home','ghost')}</div>
  <p class="small muted">Bu bağlantıda yalnızca herkese açık Supabase Project URL ve publishable key var. Gizli bir anahtar içermez. Sitenin yalın alan adı ise bu kurulum yöntemiyle yeni cihazları otomatik bağlamaz; tam bağlantıyı paylaş.</p>
  ${messages()}${btn('Bağlantıyı Değiştir','change-config','ghost full small')}
</div>`)+footer;}
async function saveConfig(){if(st.busy)return;const url=document.getElementById('project-url')?.value.trim()||'';const key=document.getElementById('public-key')?.value.trim()||'';st.busy=true;st.err='';render();
  try{const cfg=validateConfig({url,key});await loadClient(cfg);await ensureSession();await query('stats_member_appreciation');localStorage.setItem(STORE,JSON.stringify(cfg));st.notice='Supabase bağlantısı kuruldu!';st.busy=false;st.page='share';shareView();}
  catch(e){st.err='Bağlantı başarısız: '+(e.message||e);st.busy=false;st.page='setup';render();const u=document.getElementById('project-url'),k=document.getElementById('public-key');if(u)u.value=url;if(k)k.value=key;}}
async function startup(){try{const f=location.hash.replace(/^#/,'');if(f.startsWith('project=')){const p=new URLSearchParams(f);const c=validateConfig({url:p.get('project'),key:p.get('key')});localStorage.setItem(STORE,JSON.stringify(c));history.replaceState(null,'',location.pathname+location.search);}
    const saved=localStorage.getItem(STORE);if(!saved){st.page='setup';render();return;}const cfg=validateConfig(JSON.parse(saved));await loadClient(cfg);
    const {data:{session},error}=await client.auth.getSession();if(error)throw Error(error.message);
    if(session){const {data:profile,error:pe}=await client.from('profiles').select('id,nickname,emoji,favorite,least_favorite,backup,match_mode,status').eq('id',session.user.id).maybeSingle();if(pe)throw Error(pe.message);
      if(profile){st.profile=profile;st.nickname={text:profile.nickname,emoji:profile.emoji};st.answers={favorite:profile.favorite,leastFavorite:profile.least_favorite,backup:profile.backup,matchMode:profile.match_mode};
        const room=await findRoom();if(room){enterRoom(room);return;}
        const pending=await rpc('get_pending_feedback_room');if(pending){st.endedRoom=pending;st.page='feedback';render();void fetchFeedbackTarget();return;}
      }}st.page='home';render();}
  catch(e){st.page='setup';st.err='Kurulum veya bağlantı hatası: '+(e.message||e);render();}}

root.addEventListener('click',async ev=>{const t=ev.target.closest('button');if(!t||st.busy&&t.dataset.action!=='home')return;
  const choice=t.dataset.choice;if(choice){const q=QUESTIONS[st.questionIndex];if(q.options.includes(choice)){st.answers[q.id]=choice;st.err='';render();}return;}
  const bucket=t.dataset.bucket;if(bucket){st.selectedBucket=bucket;render();return;}
  const action=t.dataset.action;if(!action)return;
  if(action==='save-config')return void saveConfig();
  if(action==='home')return navigate('home');
  if(action==='join'){st.nickname=null;return navigate('nickname');}
  if(action==='roll'){st.nickname=makeNickname();st.err='';return render();}
  if(action==='quiz-start')return startQuiz();
  if(action==='quiz-back'){if(st.questionIndex>0){st.questionIndex--;render();}else navigate('nickname');return;}
  if(action==='quiz-next')return void finishQuiz();
  if(action==='results')return navigate('results');
  if(action==='stats')return void showStats();
  if(action==='start-match')return void beginMatching();
  if(action==='cancel-match')return void rpc('cancel_search').then(()=>{navigate('results');}).catch(e=>{st.err=e.message;render();});
  if(action==='retry-match')return void beginMatching();
  if(action==='send-message')return void sendMessage();
  if(action==='end-room')return void finishRoom(true);
  if(action==='toggle-report'){st.reportOpen=!st.reportOpen;return render();}
  if(action==='report-user')return void reportUser();
  if(action==='block-user')return void blockUser();
  if(action==='submit-feedback')return void submitFeedback();
  if(action==='share')return shareView();
  if(action==='change-config'){stopLive();st.page='setup';st.notice='Mevcut bağlantıyı değiştiriyorsun. Diğer cihazlara yeni tam bağlantıyı göndermelisin.';return render();}
  if(action==='copy-url'){const value=document.getElementById('share-url')?.value||'';try{await navigator.clipboard.writeText(value);st.notice='Bağlantı kopyalandı.';}catch{document.getElementById('share-url')?.select();st.notice='Bağlantıyı seçtim; Kopyala menüsünü kullan.';}return shareView();}
});
root.addEventListener('change',ev=>{const el=ev.target;if(el.id==='preset-message')st.selectedMessage=el.value;if(el.id==='report-reason')st.reportReason=el.value;});
window.addEventListener('unhandledrejection',ev=>{st.err='Beklenmeyen hata: '+String(ev.reason?.message||ev.reason);render();});
void startup();
