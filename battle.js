window.GuildBattle = (() => {
  const {$, yen, sleep, esc} = GuildUtils;
  let data;
  function init(d){ data=d; }
  // ===== レイドボス（普段の敵リストとは別に、期間限定で全員で削る共通の敵） =====
  function raidBoss(){ return data && data.raidBoss; }
  function raidActive(){ const b=raidBoss(); return !!(b && b.enabled && !b.defeated); }
  function enemy(){
    if(!data) data=GuildStorage.getData();
    if(raidActive()){
      const b=data.raidBoss;
      return {id:'raid', name:b.name||'レイドボス', hp:b.hp, maxHp:b.maxHp, image:b.image, bg:b.bg, stage:'レイド討伐', scale:100, isRaid:true};
    }
    const list=data.monsters||[]; const i=GuildUtils.clamp(data.currentEnemyIndex||0,0,Math.max(0,list.length-1)); data.currentEnemyIndex=i; return list[i];
  }
  function isFinalEnemy(e){ if(!e) return false; if(e.isRaid) return true; const list=(data&&data.monsters)||GuildStorage.getData().monsters||[]; const idx=list.indexOf(e); return idx>=0 ? idx===list.length-1 : (list.length>0 && list[list.length-1] && list[list.length-1].id===e.id); }
  // 倒した敵の「次」が最後の敵(ラスボス)なら覚醒演出の対象
  function nextIsFinal(){ const list=(data&&data.monsters)||[]; const ni=(data.currentEnemyIndex||0)+1; return ni===list.length-1 && list.length>=2; }
  async function playAwaken(){
    const ov=$('awakenOverlay'); const field=$('battleField')||$('screenMain');
    if(field) field.classList.add('awaken-shake');
    if(ov){ ov.classList.remove('on'); void ov.offsetWidth; ov.classList.add('on'); }
    GuildAudio.playSe('defeat');
    await sleep(1600);
    if(ov) ov.classList.remove('on');
    if(field) field.classList.remove('awaken-shake');
  }
  // ===== 撃破演出（管理画面「💥 撃破演出」で選んだスタイル・画像を反映）=====
  function defeatEffectSettings(){
    const s=(data&&data.settings)||{};
    return Object.assign({style:'pop', image:'', imageEnabled:false}, s.defeatEffect||{});
  }
  // ===== ダメージ演出（管理画面「💢 ダメージ演出」で選んだスタイルを反映）=====
  function damageEffectSettings(){
    const s=(data&&data.settings)||{};
    return Object.assign({style:'default'}, s.damageEffect||{});
  }
  // ギャルゲー風エフェクト：ハートをふわっと舞い上げる（ダメージ演出・撃破演出どちらからも呼べる）
  const HEART_CHARS=['💕','💗','💖','✨'];
  function spawnHearts_(count){
    const host=$('screenMain')||document.body; if(!host) return;
    for(let i=0;i<count;i++){
      const h=document.createElement('div');
      h.className='galge-heart';
      h.textContent=HEART_CHARS[Math.floor(Math.random()*HEART_CHARS.length)];
      const startX=40+Math.random()*20; // 画面中央寄りにばらけさせる（%）
      h.style.left=startX+'%';
      h.style.setProperty('--drift', (Math.random()*60-30)+'px');
      h.style.animationDelay=(Math.random()*220)+'ms';
      h.style.fontSize=(18+Math.random()*14)+'px';
      host.appendChild(h);
      setTimeout(()=>h.remove(),1500);
    }
  }
  function triggerDefeatEffect(e){
    const cfg=defeatEffectSettings();
    if(cfg.style==='flash'){
      const ov=$('defeatFxOverlay');
      if(ov){ ov.className='style-flash'; void ov.offsetWidth; ov.classList.add('on'); setTimeout(()=>ov.classList.remove('on'),600); }
    } else if(cfg.style==='ring'){
      const ring=$('defeatRing');
      if(ring){ ring.classList.remove('on'); void ring.offsetWidth; ring.classList.add('on'); setTimeout(()=>ring.classList.remove('on'),720); }
    } else if(cfg.style==='galge'){
      spawnHearts_(14);
    }
    if(cfg.imageEnabled){
      const imgSrc = (e && e.defeatImage) ? e.defeatImage : cfg.image;
      if(imgSrc){
        const img=$('defeatImagePop');
        if(img){
          img.src=GuildUtils.driveImg(imgSrc);
          img.classList.remove('on'); void img.offsetWidth; img.classList.add('on');
          setTimeout(()=>img.classList.remove('on'),1200);
        }
      }
    }
  }
  function bgmKey(e){ return (e&&e.bgm) || 'slime'; }
  function pickText(e,cat){ const arr=(e&&e.texts&&Array.isArray(e.texts[cat]))?e.texts[cat].filter(t=>t&&t.trim()):[]; return arr.length? arr[Math.floor(Math.random()*arr.length)] : ''; }
  function showSpeech(text){
    const box=$('enemySpeech'); if(!box || !text) return;
    box.textContent=text; box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
  }
  let lastShownEnemyId='';
  function nextEnemy(){ const list=data.monsters||[]; if((data.currentEnemyIndex||0) < list.length-1) data.currentEnemyIndex++; const e=enemy(); if(e && Number(e.hp)<=0) e.hp=e.maxHp; GuildStorage.save(); render(); }
  let suppressBgm=false;
  function resetAudioFlag(){ suppressBgm=false; lastShownEnemyId=''; }
  function render(quiet){
    if(isRaidActive()) return renderRaid();
    const e=enemy(); const c=GuildCustomer.current(); if(!e) return;
    if(!suppressBgm && !quiet){ const bk=bgmKey(e); GuildAudio.playBgm(bk); }
    $('adventurerName').innerHTML = c ? (GuildUtils.avatarTag(c)+GuildUtils.esc(c.name)) : GuildUtils.esc('名もなき'+(window.GuildTheme?GuildTheme.w('customer'):'冒険者'));
    $('adventurerSub').textContent = `Lv.${c?c.level:1} / ${c&&c.title?c.title:'二つ名なし'}`;
    $('stageName').textContent = `${(window.GuildTheme?GuildTheme.w('stage'):'現在ステージ')}：${e.stage||'---'}`;
    const enemyLabel = (window.GuildTheme?(isFinalEnemy(e)?GuildTheme.w('boss'):GuildTheme.w('enemy')):(isFinalEnemy(e)?'魔王':'敵'));
    $('enemyName').textContent = (e.name? (enemyLabel+'：'+e.name) : '---');
    $('enemyHpText').textContent = `${(window.GuildTheme?GuildTheme.w('hpLabel'):'HP')} ${Math.max(0,Math.ceil(Number(e.hp)||0))} / ${e.maxHp||0}`;
    $('enemyHpFill').style.width = `${Math.max(0,Math.min(100,(Number(e.hp||0)/Number(e.maxHp||1))*100))}%`;
    GuildUI.applyBg(e.bg);
    const sprite=$('enemySprite'); sprite.classList.remove('hit','defeated'); sprite.dataset.enemyId = e.id || '';
    const sc=(Number(e.scale)||70)/100, ox=Number(e.offsetX)||0, oy=Number(e.offsetY)||0;
    sprite.style.setProperty('--enemy-scale', sc); sprite.style.setProperty('--enemy-ox', ox+'%'); sprite.style.setProperty('--enemy-oy', oy+'%');
    sprite.innerHTML = e.image ? `<img src="${esc(GuildUtils.driveImg(e.image))}" alt="${esc(e.name)}" onload="this.parentNode && this.parentNode.classList.add('loaded')" onerror="this.replaceWith(document.createTextNode('👾'))">` : '👾';
    if((e.id||e.name)!==lastShownEnemyId){ lastShownEnemyId=e.id||e.name; const t=pickText(e,'appear'); if(t) showSpeech(t); }
    GuildUI.renderNotice(data.settings); GuildStorage.save();
  }
  // レイドボス専用のダメージ処理：ローカルで計算せず、必ずGASに問い合わせて「本当のHP」を受け取ってから演出する。
  // これにより、同時に他のお客様が注文していても、ダメージが正しく合算される。
  async function applyRaidDamage(total, done){
    const chunk=Math.max(0,Number(total)||0);
    $('screenMain')?.classList.add('combat-lock'); GuildUI.show('screenMain');
    const wasDefeated = !!(data.raidBoss && data.raidBoss.defeated);
    GuildAudio.playBgm('daimaou');
    render();
    if(chunk<=0){ $('screenMain')?.classList.remove('combat-lock'); done&&done(false,false); return; }
    GuildAudio.playSe('damage');
    const sprite=$('enemySprite'); if(sprite){ sprite.classList.remove('hit'); void sprite.offsetWidth; sprite.classList.add('hit'); }
    const damagePop=$('damagePop');
    const dmgCfg=damageEffectSettings();
    if(damagePop){
      if(dmgCfg.style==='galge'){ damagePop.textContent=''; damagePop.classList.remove('on'); spawnHearts_(5); }
      else { damagePop.textContent='-'+yen(chunk,data.settings.currency); damagePop.classList.remove('on'); void damagePop.offsetWidth; damagePop.classList.add('on'); }
    }
    await sleep(420);
    const boss = await GuildStorage.applyRaidDamage(chunk); // ここでGASに減算してもらい、確定したHPを受け取る
    render(); GuildStorage.save();
    await sleep(930);
    const nowDefeated = !!(boss && boss.defeated);
    if(nowDefeated){
      const sprite2=$('enemySprite'); if(sprite2) sprite2.classList.add('defeated');
      triggerDefeatEffect({name:boss.name, defeatImage:''});
      const defeatPop=$('defeatPop');
      if(defeatPop){ defeatPop.textContent=(window.GuildTheme?GuildTheme.w('bossDefeatText'):'討伐成功！'); defeatPop.classList.add('on'); }
      GuildAudio.stopBgm(); GuildAudio.playSe('victory');
      setTimeout(()=>{
        if(defeatPop) defeatPop.classList.remove('on');
        if(window.GuildApp && GuildApp.showRaidVictory) GuildApp.showRaidVictory(boss, !wasDefeated);
      },1600);
      await sleep(2600);
      done&&done(true,true);
    } else {
      $('screenMain')?.classList.remove('combat-lock');
      done&&done(false,false);
    }
  }
  function isRaidActive(){ return !!(data && data.raid && data.raid.enabled && Number(data.raid.hp)>0); }
  // レイドボス表示：普段の敵表示エリアをそのまま流用する（別画面を作らず、見た目の混乱を避けるため）
  function renderRaid(){
    const r=data.raid||{};
    $('adventurerName').innerHTML = (GuildCustomer.current()? (GuildUtils.avatarTag(GuildCustomer.current())+GuildUtils.esc(GuildCustomer.current().name)) : '');
    $('stageName').textContent = '⚔️ 期間限定レイドボス';
    $('enemyName').textContent = 'レイドボス：'+(r.name||'???')+(r.collaboratorName?'（コラボ：'+r.collaboratorName+'）':'');
    $('enemyHpText').textContent = `HP ${Math.max(0,Math.ceil(Number(r.hp)||0)).toLocaleString()} / ${(Number(r.maxHp)||0).toLocaleString()}`;
    $('enemyHpFill').style.width = `${Math.max(0,Math.min(100,(Number(r.hp||0)/Number(r.maxHp||1))*100))}%`;
    GuildUI.applyBg(r.bg);
    const sprite=$('enemySprite'); sprite.classList.remove('hit','defeated');
    sprite.innerHTML = r.image ? `<img src="${esc(GuildUtils.driveImg(r.image))}" alt="${esc(r.name||'')}" onerror="this.replaceWith(document.createTextNode('👹'))">` : '👹';
    if(r.message) showSpeech(r.message);
  }
  // レイドボスへのダメージ：GAS側で確定した本当のHPを使う（複数端末の同時注文でも取りこぼさない）
  async function applyRaidDamage(chunk, done){
    GuildAudio.playSe('damage');
    const sprite=$('enemySprite'); if(sprite){ sprite.classList.remove('hit'); void sprite.offsetWidth; sprite.classList.add('hit'); }
    const damagePop=$('damagePop');
    const dmgCfg=damageEffectSettings();
    if(dmgCfg.style==='galge'){ damagePop.textContent=''; damagePop.classList.remove('on'); spawnHearts_(5); }
    else { damagePop.textContent='-'+yen(chunk,data.settings.currency); damagePop.classList.remove('on'); void damagePop.offsetWidth; damagePop.classList.add('on'); }
    const result=await GuildStorage.applyRaidDamage(chunk);
    if(result) data.raid=result;
    await sleep(420);
    renderRaid(); GuildStorage.save();
    await sleep(650);
    const justDefeated = !!(result && result._justDefeated);
    if(justDefeated){
      triggerDefeatEffect(null);
      GuildAudio.stopBgm(); GuildAudio.playSe('victory');
      const defeatPop=$('defeatPop'); if(defeatPop){ defeatPop.textContent='🎉 レイドボス討伐！'; defeatPop.classList.add('on'); }
      await sleep(2200);
      if(defeatPop) defeatPop.classList.remove('on');
    }
    done && done(justDefeated);
  }
  async function applyDamage(total, done){
    if(isRaidActive()){ return applyRaidDamage(total, (justDefeated)=>{ done && done(justDefeated, justDefeated); }); }
    if(raidActive()) return applyRaidDamage(total, done);
    let remaining=Math.max(0,Number(total)||0); let defeatedAny=false, finalDefeated=false;
    $('screenMain')?.classList.add('combat-lock'); GuildUI.show('screenMain');
    // 今回の攻撃で複数の敵を通過するか判定
    const list=data.monsters||[]; let startIdx=data.currentEnemyIndex||0; let acc=remaining; let willMultiKill=false;
    for(let i=startIdx;i<list.length;i++){ const hp=Number(list[i].hp); const h=(hp<=0?Number(list[i].maxHp):hp)||0; if(acc>=h){ acc-=h; if(i<list.length-1) willMultiKill=true; } else break; }
    suppressBgm = willMultiKill;   // 複数撃破中は途中BGMを鳴らさない（最後だけ鳴らす）
    render();
    async function step(){
      const e=enemy(); if(!e || remaining<=0){ suppressBgm=false; done&&done(defeatedAny,finalDefeated); return; }
      e.maxHp=Number(e.maxHp||e.hp||1); e.hp=Number.isFinite(Number(e.hp))?Number(e.hp):e.maxHp;
      if(e.hp<=0){ if(isFinalEnemy(e)){ suppressBgm=false; done&&done(defeatedAny,finalDefeated); return; } nextEnemy(); await sleep(450); return step(); }
      // この敵で止まる（＝倒しきれない or 最後の敵）なら、その敵のBGMを鳴らす
      const willKill = remaining>=e.hp;
      const bossArrived = isFinalEnemy(e);
      if(!willKill || bossArrived){ suppressBgm=false; GuildAudio.playBgm(bgmKey(e)); }
      // 一括討伐で魔王に到達したら、魔王BGMをしっかり聞かせてラスボス感を出す
      if(bossArrived && willKill){ await sleep(2400); }
      const chunk=Math.min(remaining,e.hp); remaining-=chunk; GuildAudio.playSe('damage');
      const sprite=$('enemySprite'); sprite.classList.remove('hit'); void sprite.offsetWidth; sprite.classList.add('hit');
      const damagePop=$('damagePop');
      const dmgCfg=damageEffectSettings();
      if(dmgCfg.style==='galge'){
        damagePop.textContent=''; damagePop.classList.remove('on');
        spawnHearts_(5);
      } else {
        damagePop.textContent='-'+yen(chunk,data.settings.currency); damagePop.classList.remove('on'); void damagePop.offsetWidth; damagePop.classList.add('on');
      }
      await sleep(420); e.hp=Math.max(0,Number(e.hp||0)-chunk); render(); GuildStorage.save();
      { const dt=pickText(e,'damage'); if(dt) showSpeech(dt); }
      await sleep(930);
      if(e.hp<=0){
        defeatedAny=true; const finalBoss=isFinalEnemy(e); if(finalBoss) finalDefeated=true; sprite.classList.add('defeated');
        { const ft=pickText(e,'defeat'); if(ft) showSpeech(ft); }
        triggerDefeatEffect(e);
        const defeatPop=$('defeatPop'); defeatPop.textContent=finalBoss?(window.GuildTheme?GuildTheme.w('bossDefeatText'):'魔王討伐！'):((window.GuildTheme?GuildTheme.w('defeat'):'撃破')+'！'); defeatPop.classList.add('on');
        if(finalBoss){ suppressBgm=true; GuildAudio.stopBgm(); GuildAudio.playSe('victory');
          setTimeout(()=>{ defeatPop.classList.remove('on'); if(window.GuildApp && GuildApp.showVictoryClear) GuildApp.showVictoryClear(); }, 1600);
        } else { GuildAudio.playSe('defeat'); }
        await sleep(finalBoss?2600:1350); defeatPop.classList.remove('on');
        if(finalBoss){ done&&done(defeatedAny,finalDefeated); }
        else if(nextIsFinal()){
          // 魔王撃破 → 次はラスボス(覚醒魔王)。覚醒演出を挟んでからBGMをdaimaouに切り替え
          // ただし店舗のテーマ設定で演出を無効化している場合はスキップ（テーマによって「覚醒」が合わないケース向け）
          const awakenOn = ((data&&data.settings&&data.settings.themeCustom)||{}).awakenEnabled!==false;
          if(awakenOn) await playAwaken();
          nextEnemy();            // 覚醒魔王へ
          suppressBgm=false;      // 抑制を解除して
          const be=enemy(); if(be) GuildAudio.playBgm(bgmKey(be));  // daimaou BGMを確実に鳴らす
          await sleep(650); return step();
        }
        else{ nextEnemy(); await sleep(650); return step(); }
      }else{ await sleep(350); return step(); }
    }
    return step();
  }
  return {init, render, enemy, nextEnemy, applyDamage, isFinalEnemy, bgmKey, resetAudioFlag, raidActive, raidBoss};
})();
