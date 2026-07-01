window.GuildBattle = (() => {
  const {$, yen, sleep, esc} = GuildUtils;
  let data;
  function init(d){ data=d; }
  function enemy(){ if(!data) data=GuildStorage.getData(); const list=data.monsters||[]; const i=GuildUtils.clamp(data.currentEnemyIndex||0,0,Math.max(0,list.length-1)); data.currentEnemyIndex=i; return list[i]; }
  function isFinalEnemy(e){ return !!e && (/maou/i.test(String(e.id||'')) || String(e.name||'').includes('魔王')); }
  function bgmKey(e){ return (e&&e.bgm) || 'slime'; }
  function nextEnemy(){ const list=data.monsters||[]; if((data.currentEnemyIndex||0) < list.length-1) data.currentEnemyIndex++; const e=enemy(); if(e && Number(e.hp)<=0) e.hp=e.maxHp; GuildStorage.save(); render(); }
  let suppressBgm=false;
  function resetAudioFlag(){ suppressBgm=false; }
  function render(quiet){
    const e=enemy(); const c=GuildCustomer.current(); if(!e) return;
    if(!suppressBgm && !quiet){ const bk=bgmKey(e); GuildAudio.playBgm(bk); }
    $('adventurerName').textContent = c ? c.name : '名もなき冒険者';
    $('adventurerSub').textContent = `Lv.${c?c.level:1} / ${c&&c.title?c.title:'二つ名なし'}`;
    $('stageName').textContent = `現在ステージ：${e.stage||'---'}`;
    $('enemyName').textContent = e.name || '---';
    $('enemyHpText').textContent = `HP ${Math.max(0,Math.ceil(Number(e.hp)||0))} / ${e.maxHp||0}`;
    $('enemyHpFill').style.width = `${Math.max(0,Math.min(100,(Number(e.hp||0)/Number(e.maxHp||1))*100))}%`;
    GuildUI.applyBg(e.bg);
    const sprite=$('enemySprite'); sprite.classList.remove('hit','defeated'); sprite.dataset.enemyId = e.id || '';
    const sc=(Number(e.scale)||100)/100, ox=Number(e.offsetX)||0, oy=Number(e.offsetY)||0;
    sprite.style.setProperty('--enemy-scale', sc); sprite.style.setProperty('--enemy-ox', ox+'%'); sprite.style.setProperty('--enemy-oy', oy+'%');
    sprite.innerHTML = e.image ? `<img src="${esc(GuildUtils.driveImg(e.image))}" alt="${esc(e.name)}" onload="this.parentNode && this.parentNode.classList.add('loaded')" onerror="this.replaceWith(document.createTextNode('👾'))">` : '👾';
    GuildUI.renderNotice(data.settings); GuildStorage.save();
  }
  async function applyDamage(total, done){
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
      const damagePop=$('damagePop'); damagePop.textContent='-'+yen(chunk,data.settings.currency); damagePop.classList.remove('on'); void damagePop.offsetWidth; damagePop.classList.add('on');
      await sleep(420); e.hp=Math.max(0,Number(e.hp||0)-chunk); render(); GuildStorage.save(); await sleep(930);
      if(e.hp<=0){
        defeatedAny=true; const finalBoss=isFinalEnemy(e); if(finalBoss) finalDefeated=true; sprite.classList.add('defeated');
        const defeatPop=$('defeatPop'); defeatPop.textContent=finalBoss?'魔王討伐！':'撃破！'; defeatPop.classList.add('on');
        if(finalBoss){ suppressBgm=true; GuildAudio.stopBgm(); GuildAudio.playSe('victory');
          setTimeout(()=>{ defeatPop.classList.remove('on'); if(window.GuildApp && GuildApp.showVictoryClear) GuildApp.showVictoryClear(); }, 1600);
        } else { GuildAudio.playSe('defeat'); }
        await sleep(finalBoss?2600:1350); defeatPop.classList.remove('on');
        if(finalBoss){ done&&done(defeatedAny,finalDefeated); }else{ nextEnemy(); await sleep(650); return step(); }
      }else{ await sleep(350); return step(); }
    }
    return step();
  }
  return {init, render, enemy, nextEnemy, applyDamage, isFinalEnemy, bgmKey, resetAudioFlag};
})();
