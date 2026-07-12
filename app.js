window.GuildApp = {VERSION:'4.0'};
(async function(){
  const {$}=GuildUtils; if(window.GuildTheme) await GuildTheme.init(); const data=await GuildStorage.init();
  // ===== アプリ内ブラウザ（LINE/Instagram/Facebook/Google等）検出 =====
  // これらのアプリ内蔵ブラウザは保存領域や共有機能に制限があり、正しく動作しないことがあるため、
  // 気づいてもらえるよう案内バナーを出す（LINEは<head>内のスクリプトで自動的にSafari等へ切り替え済みのはず）。
  (function checkInAppBrowser(){
    try{
      const ua=navigator.userAgent||'';
      let name=null;
      if(/FBAN|FBAV/i.test(ua)) name='Facebook';
      else if(/Instagram/i.test(ua)) name='Instagram';
      else if(/GSA\//i.test(ua)) name='Google';
      else if(/Line\//i.test(ua)) name='LINE';
      else if(/Twitter/i.test(ua)) name='X(Twitter)';
      if(!name) return;
      const banner=$('inAppBrowserBanner'); if(!banner) return;
      $('inAppBrowserText').textContent=name+'のアプリ内ブラウザで開いています。正しく動作しない場合は、右上のメニューや共有ボタンから「ブラウザで開く」を選んでください。';
      banner.classList.remove('hidden');
      if($('btnCopyPageUrl')) $('btnCopyPageUrl').onclick=async()=>{
        try{ await navigator.clipboard.writeText(location.href); GuildUI.toast('URLをコピーしました'); }
        catch(e){ GuildUI.toast('コピーできませんでした。URL欄を長押しして選択してください'); }
      };
      if($('btnCloseInAppBanner')) $('btnCloseInAppBanner').onclick=()=>banner.classList.add('hidden');
    }catch(e){}
  })();
  // 他端末で選ばれたコンセプト（RPG/SF/魔法学校）と、呼び名・フォント・カラーをこの端末にも反映
  if(window.GuildTheme){
    try{
      if(data.settings.currentPresetId && GuildTheme.loadPresets){
        const presets=await GuildTheme.loadPresets();
        const p=(presets||[]).find(x=>x.id===data.settings.currentPresetId);
        if(p) GuildTheme.applyPresetTheme(p);
        else GuildTheme.clearOverride(); // 保存されているプリセットIDが見つからない場合も既定へ
      } else {
        // プリセット未使用（既定/最初のRPGテーマなど）の場合、この端末にだけ古いプリセットの色が
        // 残っていることがあるため、ここで必ず既定にリセットしてから下の個別カスタムを乗せる
        GuildTheme.clearOverride();
      }
    }catch(e){}
    try{ if(data.settings.themeWords) GuildTheme.saveWordsOverride(data.settings.themeWords); }catch(e){}
    try{ if(data.settings.themeFonts) GuildTheme.saveFontsOverride(data.settings.themeFonts); }catch(e){}
    try{ if(data.settings.themeColors) GuildTheme.saveColorsOverride(data.settings.themeColors); }catch(e){}
    try{ if(data.settings.uiTheme) GuildTheme.saveUiThemeOverride(data.settings.uiTheme); }catch(e){}
  }
  GuildAudio.init(data.settings); GuildBattle.init(data); GuildMenu.init(data); GuildUI.renderNotice(data.settings);
  GuildApp.onSynced=function(){ try{ GuildMenu.init(data); GuildUI.renderNotice(data.settings); GuildBattle.render(); if(typeof renderParty==='function') renderParty(); }catch(e){} };
  if(data.currentCustomer) $('nameInput').value=data.currentCustomer;
  function welcomeText(text){ const sub=document.querySelector('#screenWelcome .subtitle'); if(sub) sub.textContent=text||'メニューを開きますか？'; }
  function themeCustom(){ data.settings.themeCustom=data.settings.themeCustom||{}; return data.settings.themeCustom; }
  function assetUrl(u){ return u ? (GuildUtils.driveImg ? GuildUtils.driveImg(u) : u) : ''; }
  function startTitleDefault(){ return (window.GuildTheme&&GuildTheme.lookup&&GuildTheme.lookup('messages.titleWelcome')) || 'ギルドへ<br>ようこそ'; }
  function startSubtitleDefault(){ return (window.GuildTheme&&GuildTheme.m&&GuildTheme.m('openMenu')) || 'メニューを開きますか？'; }
  function applyStartTheme(){
    const c=themeCustom();
    const title=document.querySelector('#screenWelcome .title-logo');
    if(title) title.innerHTML=c.startTitle || startTitleDefault();
    welcomeText(c.startSubtitle || startSubtitleDefault());
    const logoEl=$('storeLogoImg');
    if(logoEl){
      const logoUrl=(data.settings.storeInfo&&data.settings.storeInfo.logo)||'';
      if(logoUrl){ logoEl.src=assetUrl(logoUrl); logoEl.style.display=''; }
      else { logoEl.style.display='none'; }
    }
    const bg=assetUrl(c.startBg||'');
    if(bg && window.GuildUI && GuildUI.applyBg) GuildUI.applyBg(bg);
    const sw=document.getElementById('screenWelcome');
    if(sw){
      if(bg){
        sw.style.backgroundImage=`linear-gradient(to bottom,rgba(0,0,0,.18),rgba(0,0,0,.70)),url("${bg}")`;
        sw.style.backgroundSize='cover';
        sw.style.backgroundPosition='center';
      }else{
        sw.style.backgroundImage='';
      }
    }
  }
  function hasActiveSession(){
    const bill=Array.isArray(data.activeBill)?data.activeBill:[];
    const c=GuildCustomer.current&&GuildCustomer.current();
    if(!gameModeOn()) return bill.length>0; // ゲームモードOFF：名前登録しないので伝票の有無だけで判定
    return bill.length>0 && !!(data.currentCustomerId||data.currentCustomer) && !(c&&c.checkedOut===true);
  }
  function isBusinessOpen(){ return !!((data.settings&&data.settings.business)||{}).open; }
  // ===== ゲームモード（Phase7）：OFFなら討伐演出なしの「ただのメニュー」として動かす =====
  // sessionGameMode: このお客様（この来店）が選んだモード。nullなら管理画面の既定値に従う
  // リロードしても忘れないよう、data.sessionGameMode（この端末のlocalStorage）にも保存しておく
  let sessionGameMode = (data.sessionGameMode===true || data.sessionGameMode===false) ? data.sessionGameMode : null;
  let gameModeNoticeShown=false;
  function gameModeOn(){ if(sessionGameMode!==null) return sessionGameMode; return !!(data.settings && data.settings.gameMode!==false); }
  function canToggleGameMode(){ return !!(data.settings && data.settings.allowCustomerGameToggle!==false); }
  function renderModeToggle(){
    const row=$('modeToggleRow'); if(!row) return;
    // 「注文再開」画面でも、選び直せるようにモード切替は出したままにする
    if(!canToggleGameMode()){ row.classList.add('hidden'); return; }
    row.classList.remove('hidden');
    const on = gameModeOn();
    if($('modeBtnGame')) $('modeBtnGame').classList.toggle('active', on);
    if($('modeBtnPlain')) $('modeBtnPlain').classList.toggle('active', !on);
  }
  function setSessionGameMode(on){
    sessionGameMode=!!on;
    data.sessionGameMode=sessionGameMode; GuildStorage.save();
    renderModeToggle();
  }
  function enterMenuScreen(isFreshEntry){
    const rpgEl=document.querySelector('#screenMain .rpg');
    if(rpgEl) rpgEl.classList.toggle('simple-mode', !gameModeOn());
    GuildUI.closeModals();
    GuildUI.renderNotice(data.settings);
    GuildUI.show('screenMain');
    if(gameModeOn()){
      applyBattleThemeBg();
      GuildBattle.render();
    }
    // ゲームモードを選んで「最初にメニューを開いた時」だけ、注意喚起を1回だけ表示する（再開時は出さない）
    if(isFreshEntry && gameModeOn() && !gameModeNoticeShown){
      const cfg=Object.assign({enabled:true,text:''}, data.settings.gameModeNotice||{});
      if(cfg.enabled && cfg.text){
        gameModeNoticeShown=true;
        const box=$('gameModeNoticeText'); if(box) box.textContent=cfg.text;
        GuildUI.openModal('modalGameModeNotice');
      }
    }
  }
  let closedPollTimer=null;
  function stopClosedPoll(){ if(closedPollTimer){ clearInterval(closedPollTimer); closedPollTimer=null; } }
  function showClosedScreen(){
    const info=data.settings.storeInfo||{};
    const hoursEl=$('closedHoursText');
    if(hoursEl) hoursEl.textContent = info.hours ? ('営業時間　'+info.hours) : '';
    GuildUI.show('screenClosed');
    stopClosedPoll();
    closedPollTimer=setInterval(async()=>{
      try{ if(GuildStorage.pullCloud) await GuildStorage.pullCloud(); }catch(e){}
      if(isBusinessOpen()){ stopClosedPoll(); showWelcomeScreen(); }
    }, 15000);
  }
  function welcomePrompt(){
    if(hasActiveSession()){
      const c=GuildCustomer.current&&GuildCustomer.current();
      const custWord=(window.GuildTheme?GuildTheme.w('customer'):'冒険者');
      const nm=(c&&c.name)||data.currentCustomer||custWord;
      return `${(window.GuildTheme?GuildTheme.w('battle'):'戦闘')}を再開しますか？\nお帰りなさい、${custWord}${nm}`;
    }
    return (themeCustom().startSubtitle || startSubtitleDefault());
  }
  function showWelcomeScreen(){
    stopClosedPoll();
    applyStartTheme();
    welcomeText(welcomePrompt());
    renderModeToggle();
    GuildUI.show('screenWelcome');
    GuildAudio.playBgm((themeCustom().startBgm)||'title');
    const creditEl=$('audioCreditText');
    if(creditEl){ const credit=(data.settings.audioCredit!==undefined)?data.settings.audioCredit:'音楽：魔王魂 / パンダの中のパンダ / BGMer'; creditEl.textContent=credit; creditEl.style.display=credit?'':'none'; }
  }
  function resumeBattle(){
    GuildAudio.stopBgm();
    enterMenuScreen();
  }
  function applyBattleThemeBg(){
    try{
      const enemies=data.monsters||[];
      const idx=Number(data.currentEnemyIndex||0);
      const m=enemies[idx]||enemies[0];
      if(m&&m.bg&&window.GuildUI&&GuildUI.applyBg) GuildUI.applyBg(m.bg);
    }catch(e){}
  }
  
  function applyVictoryTheme(){
    const c=themeCustom();
    const o=$('victoryClearOverlay');
    if(o){
      const bg=assetUrl(c.victoryBg||'');
      o.style.backgroundImage = bg ? `linear-gradient(to bottom,rgba(0,0,0,.08),rgba(0,0,0,.45)),url("${bg}")` : '';
      o.style.backgroundSize = bg ? 'cover' : '';
      o.style.backgroundPosition = bg ? 'center' : '';
    }
    const img=$('victoryClearImg');
    if(img){
      const src=c.victoryImage || 'victory_clear.PNG';
      img.src=assetUrl(src);
      img.style.display=src?'':'none';
      img.alt=(window.GuildTheme?GuildTheme.w('bossDefeatText'):'魔王討伐完了');
    }
    const vt=$('victoryClearTitle');
    if(vt){
      vt.innerHTML=c.victoryTitle||'';
      vt.style.display=c.victoryTitle?'block':'none';
    }
    const vs=$('victoryClearSubtitle');
    if(vs){
      vs.innerHTML=(c.victorySubtitle||'').replace(/\n/g,'<br>');
      vs.style.display=c.victorySubtitle?'block':'none';
    }
    const vw=$('victoryClearTextWrap');
    if(vw){
      const pos=(c.victoryTextPosition==='top'||c.victoryTextPosition==='bottom')?c.victoryTextPosition:'middle';
      vw.classList.remove('pos-top','pos-middle','pos-bottom');
      vw.classList.add('pos-'+pos);
    }
  }

  function showMasterMessage(text){
    const c=themeCustom();
    let box=$('masterMessageBox');
    if(!box){
      const panel=document.querySelector('#screenWelcome .panel.window');
      box=document.createElement('div');
      box.id='masterMessageBox';
      box.className='panel master-box';
      box.innerHTML=`<div class="master-grid"><div class="master-face"><img id="masterNoImg" src="${assetUrl(c.masterImage||'master_no.jpeg')}" alt="ギルドマスター" onerror="this.replaceWith(document.createTextNode('🧙'))"></div><div><div class="master-name" id="masterNoName">ギルドマスター</div><div id="masterMessageText"></div></div></div>`;
      panel.appendChild(box);
    }
    const img=$('masterNoImg'); if(img) img.src=assetUrl(c.masterImage||'master_no.jpeg');
    const mn=$('masterNoName'); if(mn) mn.textContent=c.masterName||'ギルドマスター';
    $('masterMessageText').textContent=text||c.masterMessage||'冷やかしか？さっさとメニューを開け';
    box.style.display='block';
  }
  function hideMasterMessage(){ const box=$('masterMessageBox'); if(box) box.style.display='none'; }

  function conceptTemplateFromPresetApp(p){
    p=p||{};
    const id=p.id||'';
    const t=p.theme||{};
    const assets=t.assets||p.assets||{};
    const messages=t.messages||{};
    const brand=t.brand||{};
    const enemies=Array.isArray(p.enemies)?p.enemies:[];
    const first=enemies[0]||{};
    const last=enemies.length?enemies[enemies.length-1]:{};
    const folder=id?('presets/'+id+'/'):'';
    function val(){
      for(let i=0;i<arguments.length;i++){
        const v=arguments[i];
        if(v!==undefined && v!==null && String(v).trim()!=='') return v;
      }
      return '';
    }
    function asset(name, fallback){
      let v=val(assets[name], fallback);
      if(!v) return '';
      if(/^https?:/i.test(v) || String(v).includes('/') || !folder) return v;
      return folder+v;
    }
    return {
      startTitle: val(messages.titleWelcome, brand.shopName ? brand.shopName+'へ<br>ようこそ' : ''),
      startSubtitle: val(messages.openMenu, 'メニューを開きますか？'),
      startBg: asset('startBg', asset('welcomeBg', first.bg||'')),
      startBgm: val(assets.startBgm, assets.titleBgm, 'title'),
      victoryBg: asset('victoryBg', asset('clearBg', last.bg||'')),
      victoryImage: asset('victoryImage', asset('clearImage', '')),
      victoryTitle: val(messages.victoryTitle, messages.clearTitle, ''),
      victorySubtitle: val(messages.victorySubtitle, messages.peace, ''),
      victoryBgm: val(assets.victoryBgm, assets.clearBgm, 'ending'),
      masterName: val(brand.masterName, 'ギルドマスター'),
      masterImage: asset('masterImage', brand.masterImage||'master_no.jpeg'),
      masterMessage: val(messages.masterDefault, '冷やかしか？さっさとメニューを開け')
    };
  }

  
  function wizardVal(id){ const el=$(id); return el ? el.value.trim() : ''; }
  function sanitizeAlnumInput(el){
    if(!el) return;
    el.addEventListener('input', ()=>{
      const cleaned = el.value.replace(/[^A-Za-z0-9]/g,'');
      if(cleaned !== el.value) el.value = cleaned;
    });
  }
  sanitizeAlnumInput($('setupAdminPassword'));
  function fillSetupWizard(){
    const c=themeCustom();
    const name=data.settings.storeName||data.settings.shopName||'';
    if($('setupStoreName')) $('setupStoreName').value=name;
    if($('setupStoreId')) $('setupStoreId').value=data.settings.storeId||'';
    if($('setupGasUrl')) $('setupGasUrl').value=data.settings.gasUrl||'';
    if($('setupDiscordUrl')) $('setupDiscordUrl').value=data.settings.discordWebhookUrl||'';
    if($('setupStartTitle')) $('setupStartTitle').value=c.startTitle||startTitleDefault();
    if($('setupStartSubtitle')) $('setupStartSubtitle').value=c.startSubtitle||startSubtitleDefault();
    if($('setupStartBg')) $('setupStartBg').value=c.startBg||'';
    if($('setupStartBgm')) $('setupStartBgm').value=c.startBgm||'title';
    if($('setupMasterName')) $('setupMasterName').value=c.masterName||'ギルドマスター';
    if($('setupMasterImage')) $('setupMasterImage').value=c.masterImage||'master_no.jpeg';
    if($('setupMasterMessage')) $('setupMasterMessage').value=c.masterMessage||'冷やかしか？さっさとメニューを開け';
    if($('setupVictoryBg')) $('setupVictoryBg').value=c.victoryBg||'';
    if($('setupVictoryImage')) $('setupVictoryImage').value=c.victoryImage||'victory_clear.PNG';
    if($('setupVictoryTitle')) $('setupVictoryTitle').value=c.victoryTitle||'';
    if($('setupVictorySubtitle')) $('setupVictorySubtitle').value=c.victorySubtitle||'';
    if($('setupVictoryBgm')) $('setupVictoryBgm').value=c.victoryBgm||'ending';
  }
  function showSetupWizard(){
    const o=$('setupWizardOverlay'); if(!o) return;
    fillSetupWizard();
    o.classList.add('show');
  }
  function hideSetupWizard(){ const o=$('setupWizardOverlay'); if(o) o.classList.remove('show'); }
  async function applySetupPreset(themeId){
    if(!themeId||!window.GuildTheme||!GuildTheme.loadPresets) return;
    try{
      const presets=await GuildTheme.loadPresets();
      const p=presets.find(x=>x&&x.id===themeId);
      if(!p) return;
      GuildTheme.applyPresetTheme(p);
      if(Array.isArray(p.enemies)){
        data.monsters=p.enemies.map(function(e,idx){ return {
          id:GuildUtils.uid('enemy'), name:e.name, stage:e.stage, maxHp:e.maxHp, hp:e.maxHp,
          bg:e.bg, background:e.bg, image:e.image, bgm:e.bgm, scale:e.scale||80, offsetX:e.offsetX||0, offsetY:e.offsetY||0, sort:idx
        }; });
        data.currentEnemyIndex=0;
      }
    }catch(e){}
  }

  
  function linkLine(label,url,text){
    if(!url) return '';
    const safe=GuildUtils.esc(url);
    return `<div><b>${label}</b>：<a href="${safe}" target="_blank" rel="noopener">${GuildUtils.esc(text||url)}</a></div>`;
  }
  function renderStoreInfo(){
    const s=(data.settings&&data.settings.storeInfo)||{};
    const name=s.name||data.settings.storeName||data.settings.shopName||'店舗情報';
    const lines=[];
    if(s.logo) lines.push(`<img src="${GuildUtils.driveImg(s.logo)}" alt="" class="store-logo" onerror="this.style.display='none'">`);
    lines.push(`<div class="store-info-name">${GuildUtils.esc(name)}</div>`);
    if(s.description) lines.push(`<div class="store-info-desc">${GuildUtils.esc(s.description).replace(/\n/g,'<br>')}</div>`);
    if(s.hours) lines.push(`<div><b>営業時間</b>：${GuildUtils.esc(s.hours).replace(/\n/g,'<br>')}</div>`);
    if(s.address) lines.push(`<div><b>住所</b>：${GuildUtils.esc(s.address).replace(/\n/g,'<br>')}</div>`);
    if(s.phone) lines.push(`<div><b>電話</b>：${GuildUtils.esc(s.phone)}</div>`);
    lines.push(linkLine('Instagram',s.instagram,'Instagram'));
    lines.push(linkLine('X',s.x,'X'));
    lines.push(linkLine('YouTube',s.youtube,'YouTube'));
    lines.push(linkLine('Web',s.website,'公式サイト'));
    lines.push(linkLine('MAP',s.mapUrl,'Google Map'));
    const body=$('storeInfoBody'); if(body) body.innerHTML=lines.filter(Boolean).join('');
  }

  function renderParty(){ const count=Math.max(1,Math.min(20,Number(data.partyCount||1)||1)); data.partyCount=count; const charge=Number(data.settings.coverCharge??500)||0; const label=(window.GuildTheme?GuildTheme.w('customerRegister'):'ギルド登録料（チャージ）'); $('partyCountView').textContent=`${count}名`; $('chargePreview').textContent=`${label}：${GuildUtils.yen(charge,data.settings.currency)} × ${count}名 = ${GuildUtils.yen(charge*count,data.settings.currency)}`; renderPartyMembers(); }
  // ===== 同行者の名前・アイコン入力（Phase6）=====
  // 代表者以外のパーティメンバー分の入力欄を、人数に合わせて動的に描画する。
  // 人数を+/-しても、すでに入力済みの内容は保持したまま再描画する。
  let partyMemberDraft=[];
  function readPartyMemberDraft(){
    const rows=document.querySelectorAll('#partyMembersBox [data-member-row]');
    partyMemberDraft=Array.from(rows).map(r=>({
      name:(r.querySelector('[data-member-name]')||{}).value||'',
      avatar:(r.querySelector('[data-member-avatar]')||{}).value||AVATAR_LIST[0]
    }));
  }
  function renderPartyMembers(){
    const box=$('partyMembersBox'); if(!box) return;
    if(!gameModeOn()){ box.innerHTML=''; return; } // ゲームモードOFF：冒険者登録自体を行わないため、同行者欄も出さない
    readPartyMemberDraft();
    const count=Math.max(1,Math.min(20,Number(data.partyCount||1)||1));
    const extra=count-1;
    if(extra<=0){ box.innerHTML=''; return; }
    let html='<p class="tiny mt">同行者の名前・アイコン（任意。入力しておくと、次回その人が一人で来店した時も「登録済みの'+(window.GuildTheme?GuildTheme.w('customer'):'冒険者')+'から選ぶ」で選べます）</p>';
    for(let i=0;i<extra;i++){
      const d=partyMemberDraft[i]||{name:'',avatar:AVATAR_LIST[0]};
      html+='<div class="row mt" data-member-row style="align-items:center;gap:6px">'+
        '<input data-member-name placeholder="同行者'+(i+1)+'の名前（任意）" value="'+GuildUtils.esc(d.name)+'" style="flex:2">'+
        '<select data-member-avatar style="flex:0 0 60px">'+AVATAR_LIST.map(a=>'<option value="'+a+'" '+(a===d.avatar?'selected':'')+'>'+a+'</option>').join('')+'</select>'+
        '</div>';
    }
    box.innerHTML=html;
  }
  // 同じ名前の人がいても見た目で区別できるように、登録時にアイコン(絵文字)を選んでもらう
  const AVATAR_LIST=['🙂','😎','🐱','🐶','🦊','🐻','🐼','🐰','🦁','🐯','🐸','🐧','🦄','🐲','👻','🎃','⭐','🔥','🍀','💎'];
  let selectedAvatar=AVATAR_LIST[0];
  let selectedAvatarImage='';
  function renderAvatarPicker(){
    const box=$('avatarPicker'); if(!box) return;
    box.innerHTML=AVATAR_LIST.map(a=>`<div class="avatar-opt${a===selectedAvatar?' selected':''}" data-avatar="${a}">${a}</div>`).join('');
    box.querySelectorAll('[data-avatar]').forEach(el=>el.onclick=()=>{ selectedAvatar=el.dataset.avatar; selectedAvatarImage=''; updateAvatarImgPreview(); renderAvatarPicker(); });
  }
  function updateAvatarImgPreview(){
    const box=$('avatarImgPreview'); const clearBtn=$('avatarImgClear');
    if(!box) return;
    if(selectedAvatarImage){ box.innerHTML=`<img src="${selectedAvatarImage}" alt="">`; if(clearBtn) clearBtn.style.display=''; }
    else { box.textContent=selectedAvatar; if(clearBtn) clearBtn.style.display='none'; }
  }
  // 画像は正方形に切り抜いて96pxまで縮小し、この端末のブラウザ内だけに保存する（クラウドへは送らない＝容量対策）
  function resizeAvatarImage(file, cb){
    const reader=new FileReader();
    reader.onload=(e)=>{
      const img=new Image();
      img.onload=()=>{
        const size=96;
        const canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size;
        const ctx=canvas.getContext('2d');
        const s=Math.min(img.width,img.height); const sx=(img.width-s)/2, sy=(img.height-s)/2;
        ctx.drawImage(img,sx,sy,s,s,0,0,size,size);
        cb(canvas.toDataURL('image/jpeg',0.72));
      };
      img.onerror=()=>{ GuildUI.toast('画像を読み込めませんでした'); };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  }
  if($('avatarImgFile')) $('avatarImgFile').onchange=(ev)=>{
    const file=ev.target.files&&ev.target.files[0]; if(!file) return;
    resizeAvatarImage(file,(dataUrl)=>{ selectedAvatarImage=dataUrl; updateAvatarImgPreview(); });
  };
  if($('avatarImgClear')) $('avatarImgClear').onclick=()=>{ selectedAvatarImage=''; if($('avatarImgFile')) $('avatarImgFile').value=''; updateAvatarImgPreview(); };
  renderAvatarPicker();
  updateAvatarImgPreview();
  function showChargeConfirm(){ const count=Math.max(1,Math.min(20,Number(data.partyCount||1)||1)); const charge=Number(data.settings.coverCharge??500)||0; const total=charge*count; const label=(window.GuildTheme?GuildTheme.w('customerRegister'):'登録料（チャージ）'); const custWord=(window.GuildTheme?GuildTheme.w('customer'):'冒険者'); const guildWord=(window.GuildTheme?GuildTheme.w('guild'):'ギルド'); const partyWord=(window.GuildTheme?GuildTheme.w('party'):'パーティ'); $('chargeConfirmBody').textContent=`${guildWord}への登録には${label}が必要です。\n\n${custWord}名：${data.currentCustomer||'未登録'}\n${partyWord}人数：${count}名\n${label}：${GuildUtils.yen(charge,data.settings.currency)} × ${count}名\n\n合計：${GuildUtils.yen(total,data.settings.currency)}\n\n登録しますか？`; GuildUI.openModal('modalChargeConfirm'); }
  function applyCoverCharge(){ const count=Math.max(1,Math.min(20,Number(data.partyCount||1)||1)); const charge=Number(data.settings.coverCharge??500)||0; const total=charge*count; const label=(window.GuildTheme?GuildTheme.w('customerRegister'):'ギルド登録料（チャージ）'); data.activeBill=Array.isArray(data.activeBill)?data.activeBill:[]; data.activeBill=data.activeBill.filter(i=>!i.isCharge); if(charge>0&&count>0){ data.activeBill.unshift({id:'cover_charge',name:label,cat:'charge',price:charge,qty:count,subtotal:total,partyCount:count,isCharge:true}); } GuildStorage.save(); }
  GuildApp.showWelcomeBack=function(){
    applyStartTheme();
    welcomeText((window.GuildTheme?GuildTheme.m('welcomeBack'):'おかえりなさい、冒険者。次のクエストを受けますか？'));
    renderModeToggle();
    GuildUI.show('screenWelcome');
    GuildAudio.playBgm((themeCustom().startBgm)||'title');
  };
  if($('setupTheme')) $('setupTheme').onchange=async()=>{
    await applySetupPreset(wizardVal('setupTheme'));
    fillSetupWizard();
  };
  if($('setupWizardSave')) $('setupWizardSave').onclick=async()=>{
    const storeName=wizardVal('setupStoreName');
    const gasUrl=wizardVal('setupGasUrl');
    if(!storeName){ GuildUI.toast('店舗名を入力してください'); return; }
    if(!gasUrl){ GuildUI.toast('GAS URLを入力してください'); return; }
    await applySetupPreset(wizardVal('setupTheme'));
    const presetTc=data.settings.themeCustom||{};
    const themeCustom={
      startTitle:wizardVal('setupStartTitle')||presetTc.startTitle||'',
      startSubtitle:wizardVal('setupStartSubtitle')||presetTc.startSubtitle||'',
      startBg:wizardVal('setupStartBg')||presetTc.startBg||'',
      startBgm:wizardVal('setupStartBgm')||presetTc.startBgm||'title',
      masterName:wizardVal('setupMasterName')||presetTc.masterName||'ギルドマスター',
      masterImage:wizardVal('setupMasterImage')||presetTc.masterImage||'master_no.jpeg',
      masterMessage:wizardVal('setupMasterMessage')||presetTc.masterMessage||'冷やかしか？さっさとメニューを開け',
      victoryBg:wizardVal('setupVictoryBg')||presetTc.victoryBg||'',
      victoryImage:wizardVal('setupVictoryImage')||presetTc.victoryImage||'',
      victoryTitle:wizardVal('setupVictoryTitle')||presetTc.victoryTitle||'',
      victorySubtitle:($('setupVictorySubtitle')?$('setupVictorySubtitle').value:'')||presetTc.victorySubtitle||'',
      victoryBgm:wizardVal('setupVictoryBgm')||presetTc.victoryBgm||'ending'
    };
    GuildStorage.completeInitialSetup({
      storeName,
      storeId:wizardVal('setupStoreId'),
      gasUrl,
      discordWebhookUrl:wizardVal('setupDiscordUrl'),
      adminPassword:wizardVal('setupAdminPassword').replace(/[^A-Za-z0-9]/g,''),
      themeCustom
    });
    data.settings.licenseContactEmail=wizardVal('setupContactEmail');
    GuildStorage.save();
    if(window.GuildLicense && GuildLicense.registerStore) GuildLicense.registerStore(data);
    hideSetupWizard();
    applyStartTheme();
    GuildUI.toast('初回セットアップを保存しました');
  };
  if($('setupWizardSkip')) $('setupWizardSkip').onclick=()=>{
    data.settings.setupDone=true;
    GuildStorage.save();
    if(window.GuildLicense && GuildLicense.registerStore) GuildLicense.registerStore(data);
    hideSetupWizard();
    GuildUI.toast('あとで管理画面から設定できます');
  };
  // 画像を「写真に保存」または「ファイルに保存」できるようにする（iOS Safariの共有シート経由）。
  // 共有シートが使えない環境では、新しいタブで開いて「長押しで保存」を案内するフォールバックにする。
  async function saveImageToDevice(url, filename){
    try{
      const res=await fetch(url);
      const blob=await res.blob();
      const file=new File([blob], filename, {type: blob.type||'image/png'});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file], title:filename});
        return;
      }
    }catch(e){}
    window.open(url, '_blank');
    GuildUI.toast('画像を長押しして「写真に追加」を選んでください');
  }
  GuildApp.showLevelUp=function(oldLevel,newLevel){ const o=$('levelUpOverlay'); $('levelUpText').textContent=`Lv.${oldLevel} → Lv.${newLevel}`; o.classList.add('show'); };
  GuildApp.showGacha=function(rarity, onDone){
    const overlay=$('gachaOverlay');
    const capsule=$('gachaCapsule');
    const suspense=$('gachaSuspense');
    const resultBox=$('gachaResultBox');
    const img=$('gachaResultImg');
    const label=$('gachaRarityLabel');
    const sparkles=$('gachaSparkles');
    const nextBtn=$('btnGachaNext');
    const saveBtn=$('btnGachaSave');
    const flash=$('gachaFlash');
    if(!overlay||!rarity) { if(onDone) onDone(); return; }

    // リセット
    capsule.classList.remove('settled');
    suspense.classList.remove('hidden');
    resultBox.classList.add('hidden');
    nextBtn.classList.add('hidden');
    if(saveBtn) saveBtn.classList.add('hidden');
    flash.classList.remove('on');
    sparkles.classList.remove('on');
    sparkles.innerHTML='';
    const color=rarity.color||'#f6c84f';
    resultBox.style.setProperty('--gacha-color', color);
    // このレアリティに複数の画像が登録されていれば、その中から完全ランダムで1枚を選ぶ
    const imgList = Array.isArray(rarity.images) && rarity.images.length ? rarity.images : (rarity.image ? [rarity.image] : []);
    const chosenImage = imgList.length ? imgList[Math.floor(Math.random()*imgList.length)] : '';
    const imgUrl = chosenImage ? GuildUtils.driveImg(chosenImage) : '';
    img.style.display = chosenImage ? '' : 'none';
    img.src = imgUrl;
    label.textContent = rarity.name||'';

    overlay.classList.add('show');
    GuildAudio.playSe(rarity.flashy?'levelup':'confirm');

    setTimeout(()=>{
      capsule.classList.add('settled');
      suspense.classList.add('hidden');
      flash.classList.add('on');
      setTimeout(()=>flash.classList.remove('on'),420);
      resultBox.classList.remove('hidden');
      if(rarity.flashy){
        GuildAudio.playSe('victory');
        sparkles.innerHTML = Array.from({length:10}).map(()=>
          '<span style="left:'+(Math.random()*90+5)+'%;top:'+(Math.random()*70+15)+'%;animation-delay:'+(Math.random()*0.6).toFixed(2)+'s">✨</span>'
        ).join('');
        sparkles.classList.add('on');
      }
      nextBtn.classList.remove('hidden');
      if(saveBtn){
        if(imgUrl){
          saveBtn.classList.remove('hidden');
          saveBtn.onclick=()=>saveImageToDevice(imgUrl, (rarity.name||'gacha')+'.png');
        } else {
          saveBtn.classList.add('hidden');
        }
      }
    }, 950);

    nextBtn.onclick=function(){
      GuildAudio.playSe('ok');
      overlay.classList.remove('show');
      if(onDone) onDone();
    };
  };
  GuildApp.showVictoryClear=function(){ const o=$('guildReturnOverlay'); if(o) o.classList.add('show'); };

  // ===== 待ち時間ミニゲーム =====
  // 用意されているゲームの一覧。ファイルが実在するものだけ settings 側で有効化する想定。
  const MINIGAMES=[
    {id:'action',  name:'アクション',       file:'minigame/Action.html'},
    {id:'slot',    name:'スロット',         file:'minigame/slot.html'},
    {id:'shooting',name:'弾幕シューティング', file:'minigame/shooting.html'}
  ];
  function minigameSettings_(){
    const def={enabled:true, games:{action:true, slot:false, shooting:false}};
    const s=(data.settings&&data.settings.minigame)||{};
    return {enabled:s.enabled!==false, games:Object.assign({}, def.games, s.games||{})};
  }
  function enabledMinigames_(){
    const cfg=minigameSettings_();
    if(!cfg.enabled) return [];
    return MINIGAMES.filter(g=>cfg.games[g.id]);
  }
  function incrementSessionOrderCount(){
    data.sessionOrderCount=(Number(data.sessionOrderCount)||0)+1;
    GuildStorage.save();
    return data.sessionOrderCount;
  }
  // 注文確定→ダメージ演出が終わった直後にorder.js側から呼ばれる
  GuildApp.offerMinigame=function(){
    const games=enabledMinigames_();
    if(!games.length) return; // 使えるミニゲームが無ければ何も出さない
    const lives=incrementSessionOrderCount();
    const t=$('minigameLivesText'); if(t) t.textContent='残機 '+lives+'（ご来店からの注文数）';
    GuildApp._pendingMinigamePick=games[Math.floor(Math.random()*games.length)];
    GuildUI.openModal('modalMinigameOffer');
  };
  function launchMinigame_(game){
    if(!game) return;
    const frame=$('minigameFrame'); const overlay=$('minigameOverlay');
    if(!frame||!overlay) return;
    const lives=Number(data.sessionOrderCount)||1;
    frame.src=game.file+'?lives='+lives;
    overlay.classList.remove('hidden');
  }
  function closeMinigame_(){
    const frame=$('minigameFrame'); const overlay=$('minigameOverlay');
    if(overlay) overlay.classList.add('hidden');
    if(frame) frame.src='about:blank'; // 音や処理を止めるため、閉じたら中身を破棄する
  }
  if($('btnMinigamePlay')) $('btnMinigamePlay').onclick=()=>{
    GuildAudio.playSe('ok'); GuildUI.closeModals();
    launchMinigame_(GuildApp._pendingMinigamePick);
  };
  if($('btnMinigameSkip')) $('btnMinigameSkip').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.closeModals(); };
  if($('btnMinigameClose')) $('btnMinigameClose').onclick=()=>{ GuildAudio.playSe('cancel'); closeMinigame_(); };
  // ミニゲーム側が「閉じてほしい」と伝えてきた場合に対応（将来のゲーム追加に備えて）
  window.addEventListener('message', function(ev){
    if(ev && ev.data && ev.data.type==='PLAY_ORDER_CLOSE') closeMinigame_();
  });


  if($('guildReturnBtn')) $('guildReturnBtn').onclick=(ev)=>{
    if(ev&&ev.stopPropagation) ev.stopPropagation();
    const g=$('guildReturnOverlay'); if(g) g.classList.remove('show');
    if(themeCustom().victoryBgm){ GuildAudio.playBgm(themeCustom().victoryBgm); } else if(GuildAudio.playEnding) GuildAudio.playEnding();   // タップ直後なので確実に鳴る
    applyVictoryTheme(); const v=$('victoryClearOverlay'); if(v) v.classList.add('show');
  };
  if($('victoryClearClose')) $('victoryClearClose').onclick=(ev)=>{
    if(ev&&ev.stopPropagation) ev.stopPropagation();
    const o=$('victoryClearOverlay'); if(o) o.classList.remove('show');
    if(GuildAudio.releaseEnding) GuildAudio.releaseEnding();
    if(GuildBattle.resetAudioFlag) GuildBattle.resetAudioFlag();
    GuildAudio.stopBgm();
    if(GuildStorage.resetProgress) GuildStorage.resetProgress({sync:true});
    GuildUI.show('screenMain');
    applyBattleThemeBg();
    GuildBattle.render();
  };
  $('levelUpClose').onclick=()=>$('levelUpOverlay').classList.remove('show');
  $('btnStartYes').onclick=()=>{
    GuildAudio.playSe('ok'); hideMasterMessage();
    if(hasActiveSession()){ resumeBattle(); return; }
    GuildAudio.stopBgm();
    // ゲームモードON/OFFに関わらず、誰が・いつ注文したか管理側で把握できるよう、名前入力は必ず経由する。
    // OFFの時に省略するのは討伐演出などのRPG演出だけ（enterMenuScreen側で分岐）。
    GuildUI.show('screenName');
  };
  $('btnStartNo').onclick=()=>{ GuildAudio.playSe('cancel'); showMasterMessage(); };
  if($('btnAdmin')) $('btnAdmin').onclick=()=>location.href='admin.html';
  if($('btnStoreInfo')) $('btnStoreInfo').onclick=()=>{ GuildAudio.playSe('ok'); renderStoreInfo(); $('storeInfoOverlay').classList.add('show'); };
  if($('btnShowTerms')) $('btnShowTerms').onclick=()=>{ GuildAudio.playSe('ok'); const b=$('termsBody'); if(b) b.innerHTML=(window.GuildTerms&&GuildTerms.html)||'利用規約が見つかりません。'; GuildUI.openModal('modalTerms'); };
  if($('btnCloseTerms')) $('btnCloseTerms').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.closeModals(); };
  if($('btnCloseGameModeNotice')) $('btnCloseGameModeNotice').onclick=()=>{ GuildAudio.playSe('ok'); GuildUI.closeModals(); };
  if($('storeInfoClose')) $('storeInfoClose').onclick=()=>{ GuildAudio.playSe('cancel'); $('storeInfoOverlay').classList.remove('show'); };
  $('btnBackWelcome').onclick=()=>{ GuildAudio.playSe('cancel'); showWelcomeScreen(); };
  $('btnNameOk').onclick=()=>{
    const n=$('nameInput').value.trim();
    if(!n){GuildAudio.playSe('cancel'); GuildUI.toast('名前を入力してください'); return;}
    GuildAudio.playSe('ok');
    const existing=GuildCustomer.findByName?GuildCustomer.findByName(n):null;
    let c;
    if(existing){
      const same=confirm((existing.avatar||'🙂')+' 「'+existing.name+'」という名前の登録者が既にいます（Lv.'+(existing.level||1)+'・来店'+(existing.visits||0)+'回）。\n\nあなたは今回選んだアイコン '+selectedAvatar+' の方ですか？\n\n「OK」→ '+(existing.avatar||'🙂')+'さんとして、そのまま登録情報を引き継ぐ\n「キャンセル」→ 別人として新規登録する');
      c = same ? GuildCustomer.setName(n,{reuseId:existing.id}) : GuildCustomer.setName(n,{avatar:selectedAvatar,avatarImage:selectedAvatarImage});
    } else {
      c = GuildCustomer.setName(n,{avatar:selectedAvatar,avatarImage:selectedAvatarImage});
    }
    const lu=c&&c._levelUp; if(lu&&lu.leveled){ GuildAudio.playSe('levelup'); if(window.GuildApp&&GuildApp.showLevelUp) GuildApp.showLevelUp(lu.oldLevel,lu.newLevel); }
    selectedAvatar=AVATAR_LIST[0]; selectedAvatarImage=''; if($('avatarImgFile')) $('avatarImgFile').value=''; renderAvatarPicker(); updateAvatarImgPreview();
    renderParty(); GuildUI.show('screenParty');
  };
  function renderExistingList(q){ const list=GuildCustomer.list().filter(c=>!q||String(c.name||'').toLowerCase().includes(q.toLowerCase())); $('existingList').innerHTML = list.length ? list.map(c=>`<button class="btn existing-pick" data-cid="${c.id}" style="display:block;width:100%;text-align:left;margin:4px 0">${GuildUtils.avatarTag(c)}${GuildUtils.esc(c.name)} <span style="opacity:.6;font-size:.85em">Lv.${c.level||1}・来店${c.visits||0}回</span></button>`).join('') : '<p style="opacity:.6;text-align:center">該当なし</p>'; document.querySelectorAll('.existing-pick').forEach(b=>b.onclick=()=>{ const c=GuildCustomer.selectExisting(b.dataset.cid); if(c){ GuildAudio.playSe('ok'); $('existingOverlay').classList.remove('show'); $('nameInput').value=c.name; const lu=c._levelUp; if(lu&&lu.leveled){ GuildAudio.playSe('levelup'); if(window.GuildApp&&GuildApp.showLevelUp) GuildApp.showLevelUp(lu.oldLevel,lu.newLevel); } renderParty(); GuildUI.show('screenParty'); } }); }
  $('btnSelectExisting').onclick=()=>{ GuildAudio.playSe('ok'); $('existingSearch').value=''; renderExistingList(''); $('existingOverlay').classList.add('show'); };
  $('existingSearch').oninput=e=>renderExistingList(e.target.value);
  $('existingClose').onclick=()=>{ GuildAudio.playSe('cancel'); $('existingOverlay').classList.remove('show'); };
  $('btnPartyMinus').onclick=()=>{ data.partyCount=Math.max(1,Number(data.partyCount||1)-1); GuildStorage.save(); renderParty(); };
  $('btnPartyPlus').onclick=()=>{ data.partyCount=Math.min(20,Number(data.partyCount||1)+1); GuildStorage.save(); renderParty(); };
  $('btnPartyBack').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.show('screenName'); };
  $('btnPartyOk').onclick=()=>{ GuildAudio.playSe('ok'); showChargeConfirm(); };
  $('btnCancelCharge').onclick=()=>GuildUI.closeModals();
  $('btnNoCharge').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.closeModals(); showWelcomeScreen(); };
  $('btnDoCharge').onclick=()=>{
    GuildAudio.playSe('ok');
    readPartyMemberDraft();
    const repName=String(data.currentCustomer||'').trim();
    partyMemberDraft.forEach(function(m){
      const nm=String(m.name||'').trim();
      if(!nm || nm===repName) return; // 空欄・代表者と同じ名前はスキップ
      if(GuildCustomer.registerOrReuse) GuildCustomer.registerOrReuse(nm, m.avatar||AVATAR_LIST[0]);
    });
    applyCoverCharge(); enterMenuScreen(true);
  };
  $('btnBackTitle').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.closeModals(); sessionGameMode=null; data.sessionGameMode=null; data.sessionOrderCount=0; GuildStorage.save(); gameModeNoticeShown=false; welcomeText('メニューを開きますか？'); showWelcomeScreen(); };
  $('btnCloseMenu').onclick=()=>GuildUI.closeModals(); $('btnCancelOrder').onclick=GuildOrder.cancelPending; $('btnNoOrder').onclick=GuildOrder.cancelPending; $('btnDoOrder').onclick=GuildOrder.confirmOrder; $('btnCheckout').onclick=GuildOrder.checkoutAsk; $('btnCancelCheckout').onclick=()=>GuildUI.closeModals(); $('btnNoCheckout').onclick=()=>GuildUI.closeModals(); $('btnDoCheckout').onclick=GuildOrder.checkoutDo;
  if($('btnReceiptConfirm')) $('btnReceiptConfirm').onclick=()=>{
    GuildAudio.playSe('ok');
    GuildUI.closeModals();
    sessionGameMode=null; data.sessionGameMode=null; data.sessionOrderCount=0; GuildStorage.save(); // 会計完了＝この方の来店は終了。次のお客様のためにモード選択をリセット
    gameModeNoticeShown=false;
    if(GuildBattle.resetAudioFlag) GuildBattle.resetAudioFlag();
    if(window.GuildApp&&GuildApp.showWelcomeBack) GuildApp.showWelcomeBack(); else showWelcomeScreen();
  };
  if($('modeBtnGame')) $('modeBtnGame').onclick=()=>{ GuildAudio.playSe('ok'); setSessionGameMode(true); };
  if($('modeBtnPlain')) $('modeBtnPlain').onclick=()=>{ GuildAudio.playSe('ok'); setSessionGameMode(false); };
  if($('btnCartOpen')) $('btnCartOpen').onclick=()=>GuildOrder.openCartReview();
  if($('btnCartBack')) $('btnCartBack').onclick=()=>{ GuildUI.closeModals(); GuildUI.openModal('modalMenu'); };
  if($('btnCartCancel')) $('btnCartCancel').onclick=()=>GuildOrder.cancelCartReview();
  if($('btnCartConfirm')) $('btnCartConfirm').onclick=()=>GuildOrder.confirmCart();
  if($('btnClosedRefresh')) $('btnClosedRefresh').onclick=()=>location.reload();
  if($('btnClosedAdmin')) $('btnClosedAdmin').onclick=()=>location.href='admin.html';
  if(window.GuildLicense && GuildLicense.checkLicense) await GuildLicense.checkLicense(data);
  let tamperResult={tampered:false};
  if(window.GuildIntegrity && GuildIntegrity.runCheck){ try{ tamperResult=await GuildIntegrity.runCheck(); }catch(e){} }
  const forceSetup = (function(){ try{ return new URLSearchParams(location.search||'').get('setup')==='1'; }catch(e){ return false; } })();
  const needsSetup = forceSetup || (GuildStorage.needsInitialSetup&&GuildStorage.needsInitialSetup());
  if(!needsSetup && window.GuildLicense && GuildLicense.status==='suspended'){
    GuildUI.show('screenSuspended');
  } else if(!needsSetup && !isBusinessOpen() && !hasActiveSession()){ showClosedScreen(); } else { showWelcomeScreen(); }
  if(needsSetup) showSetupWizard();
  // クラウド同期は待たずに画面を出しているので、同期が終わった時点で
  // 営業状態の判定がズレていたら（準備中⇄営業中）、まだタイトル/準備中画面にいる場合だけ静かに直す。
  // 既に注文中など他の画面に進んでいたら、途中で画面を切り替えて邪魔しない。
  if(data._cloudSyncPromise){
    data._cloudSyncPromise.then(()=>{
      if(needsSetup || hasActiveSession()) return;
      const onWelcome = $('screenWelcome') && $('screenWelcome').classList.contains('active');
      const onClosed = $('screenClosed') && $('screenClosed').classList.contains('active');
      if(!onWelcome && !onClosed) return; // 既に他の画面に進んでいたら何もしない
      if(!isBusinessOpen() && onWelcome){ showClosedScreen(); }
      else if(isBusinessOpen() && onClosed){ stopClosedPoll(); showWelcomeScreen(); }
    });
  }
  if(tamperResult.tampered && $('tamperOverlay')){
    $('tamperOverlay').classList.add('show');
    $('tamperUnlockBtn').onclick=async()=>{
      const code=($('tamperCodeInput').value||'').trim();
      if(!code){ $('tamperMsg').textContent='コードを入力してください'; return; }
      $('tamperMsg').textContent='確認中…';
      const ok = window.GuildIntegrity && await GuildIntegrity.verifyUnlockCode(code, tamperResult);
      if(ok){ $('tamperOverlay').classList.remove('show'); }
      else { $('tamperMsg').textContent='コードが違います'; }
    };
  }
})();
