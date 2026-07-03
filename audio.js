window.GuildAudio = (() => {
  let settings = {}; let bgmAudio = null; let currentKey = ''; let enabled = true;
  let endingAudio = null; let endingLock = false;
  function init(s){ settings = s || {}; preloadEnding(); }
  // data.settings は同期処理で丸ごと差し替わることがあるため、init時点のスナップショットだけに頼らず常に最新を見る
  function liveSettings(){ try{ if(window.GuildStorage && GuildStorage.getData) return GuildStorage.getData().settings||settings; }catch(e){} return settings; }
  function preloadEnding(){
    try{ const src=path('bgm','ending'); if(src){ endingAudio=new Audio(src); endingAudio.loop=true; endingAudio.preload='auto'; endingAudio.load(); } }catch(e){}
  }
  // 魔王討伐ファンファーレ専用：事前ロード済みAudioを鳴らす（iOS制約回避）
  function playEnding(){
    if(!enabled) return;
    endingLock = true;              // これ以降、他のBGMに邪魔されない
    stopBgm(); currentKey='ending';
    if(!endingAudio){ preloadEnding(); }
    const a = endingAudio || new Audio(path('bgm','ending'));
    a.loop=true; a.volume=volume('bgm'); try{ a.currentTime=0; }catch(e){}
    const tryPlay=(n)=>{ const p=a.play(); if(p&&p.catch) p.catch(()=>{ if(n>0) setTimeout(()=>tryPlay(n-1),350); }); };
    tryPlay(4); bgmAudio=a;
  }
  function releaseEnding(){ endingLock=false; }
  function volume(type){ const s=liveSettings(); return Number(s[type === 'bgm' ? 'bgmVolume' : 'seVolume'] ?? (type==='bgm'?0.45:0.9)); }
  function path(type, key){
    if(!key) return '';
    // URL（http...）や拡張子付きファイル名(.mp3等)ならそのまま使う
    if(/^https?:\/\//i.test(key) || /\.(mp3|wav|ogg|m4a)$/i.test(key)) return key;
    const files = liveSettings().audioFiles || {};
    if(files[type] && files[type][key]) return files[type][key];
    if(type==='bgm' && files[key]) return files[key];
    return '';
  }
  function stopBgm(){ if(bgmAudio){ try{ bgmAudio.pause(); bgmAudio.currentTime=0; }catch(e){} } bgmAudio=null; currentKey=''; }
  function playBgm(key){
    if(!enabled || !key) return;
    if(endingLock && key!=='ending') return;   // ファンファーレ中は他BGMを無視
    if(currentKey === key && bgmAudio && !bgmAudio.paused) return;
    const src = path('bgm', key); if(!src) return;
    stopBgm(); currentKey = key;
    const a = new Audio(src); a.loop=true; a.volume=volume('bgm'); a.preload='auto';
    bgmAudio = a;
    const tryPlay=(retries)=>{ const p=a.play(); if(p&&p.catch) p.catch(()=>{ if(retries>0) setTimeout(()=>tryPlay(retries-1), 400); }); };
    tryPlay(3);
  }
  const sePool={};
  function playSe(key){
    if(!enabled || !key) return; const src = path('se', key); if(!src) return;
    try{
      // 同じSEは使い回し、連続撃破時の大量Audio生成を防ぐ（iOS対策）
      let a=sePool[key];
      if(!a){ a=new Audio(src); a.loop=false; sePool[key]=a; }
      a.volume=volume('se'); try{ a.currentTime=0; }catch(e){}
      const p=a.play(); if(p&&p.catch) p.catch(()=>{});
    }catch(e){}
  }
  function play(key){ const map={ok:'ok',bad:'bad',cancel:'cancel',add:'add',confirm:'confirm',hit:'damage',damage:'damage',defeat:'defeat',levelup:'levelup',victory:'victory'}; playSe(map[key]||key); }
  function mute(flag){ enabled = !flag; if(flag) stopBgm(); }
  return {init, playBgm, stopBgm, playSe, play, mute, playEnding, releaseEnding};
})();
