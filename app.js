window.GuildApp = {VERSION:'4.0'};
(async function(){
  const {$}=GuildUtils; if(window.GuildTheme) await GuildTheme.init(); const data=await GuildStorage.init();
  // 他端末で保存された呼び名・フォントをこの端末にも反映（クラウド同期分をテーマへ適用）
  if(window.GuildTheme){
    try{ if(data.settings.themeWords) GuildTheme.saveWordsOverride(data.settings.themeWords); }catch(e){}
    try{ if(data.settings.themeFonts) GuildTheme.saveFontsOverride(data.settings.themeFonts); }catch(e){}
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
    return bill.length>0 && !!(data.currentCustomerId||data.currentCustomer) && !(c&&c.checkedOut===true);
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
    applyStartTheme();
    welcomeText(welcomePrompt());
    GuildUI.show('screenWelcome');
    GuildAudio.playBgm((themeCustom().startBgm)||'title');
    const creditEl=$('audioCreditText');
    if(creditEl){ const credit=(data.settings.audioCredit!==undefined)?data.settings.audioCredit:'音楽：魔王魂 / パンダの中のパンダ'; creditEl.textContent=credit; creditEl.style.display=credit?'':'none'; }
  }
  function resumeBattle(){
    GuildAudio.stopBgm();
    GuildUI.show('screenMain');
    applyBattleThemeBg();
    GuildBattle.render();
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
          bg:e.bg, background:e.bg, image:e.image, bgm:e.bgm, scale:e.scale||100, offsetX:e.offsetX||0, offsetY:e.offsetY||0, sort:idx
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

  function renderParty(){ const count=Math.max(1,Math.min(20,Number(data.partyCount||1)||1)); data.partyCount=count; const charge=Number(data.settings.coverCharge??500)||0; const label=(window.GuildTheme?GuildTheme.w('customerRegister'):'ギルド登録料（チャージ）'); $('partyCountView').textContent=`${count}名`; $('chargePreview').textContent=`${label}：${GuildUtils.yen(charge,data.settings.currency)} × ${count}名 = ${GuildUtils.yen(charge*count,data.settings.currency)}`; }
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
      adminPassword:wizardVal('setupAdminPassword'),
      themeCustom
    });
    hideSetupWizard();
    applyStartTheme();
    GuildUI.toast('初回セットアップを保存しました');
  };
  if($('setupWizardSkip')) $('setupWizardSkip').onclick=()=>{
    data.settings.setupDone=true;
    GuildStorage.save();
    hideSetupWizard();
    GuildUI.toast('あとで管理画面から設定できます');
  };
  GuildApp.showLevelUp=function(oldLevel,newLevel){ const o=$('levelUpOverlay'); $('levelUpText').textContent=`Lv.${oldLevel} → Lv.${newLevel}`; o.classList.add('show'); };
  GuildApp.showVictoryClear=function(){ const o=$('guildReturnOverlay'); if(o) o.classList.add('show'); };
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
  $('btnStartYes').onclick=()=>{ GuildAudio.playSe('ok'); hideMasterMessage(); if(hasActiveSession()){ resumeBattle(); return; } GuildAudio.stopBgm(); GuildUI.show('screenName'); };
  $('btnStartNo').onclick=()=>{ GuildAudio.playSe('cancel'); showMasterMessage(); };
  $('btnAdmin').onclick=()=>location.href='admin.html';
  if($('btnStoreInfo')) $('btnStoreInfo').onclick=()=>{ GuildAudio.playSe('ok'); renderStoreInfo(); $('storeInfoOverlay').classList.add('show'); };
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
  $('btnDoCharge').onclick=()=>{ GuildAudio.playSe('ok'); applyCoverCharge(); GuildUI.closeModals(); GuildUI.renderNotice(data.settings); GuildUI.show('screenMain'); applyBattleThemeBg(); GuildBattle.render(); };
  $('btnBackTitle').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.closeModals(); welcomeText('メニューを開きますか？'); showWelcomeScreen(); };
  $('btnCloseMenu').onclick=()=>GuildUI.closeModals(); $('btnCancelOrder').onclick=GuildOrder.cancelPending; $('btnNoOrder').onclick=GuildOrder.cancelPending; $('btnDoOrder').onclick=GuildOrder.confirmOrder; $('btnCheckout').onclick=GuildOrder.checkoutAsk; $('btnCancelCheckout').onclick=()=>GuildUI.closeModals(); $('btnNoCheckout').onclick=()=>GuildUI.closeModals(); $('btnDoCheckout').onclick=GuildOrder.checkoutDo;
  showWelcomeScreen();
  const forceSetup = (function(){ try{ return new URLSearchParams(location.search||'').get('setup')==='1'; }catch(e){ return false; } })();
  if(forceSetup || (GuildStorage.needsInitialSetup&&GuildStorage.needsInitialSetup())) showSetupWizard();
})();
