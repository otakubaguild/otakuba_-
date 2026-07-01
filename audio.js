window.GuildAudio = (() => {
  let settings = {}; let bgmAudio = null; let currentKey = ''; let enabled = true;
  function init(s){ settings = s || {}; }
  function volume(type){ return Number(settings[type === 'bgm' ? 'bgmVolume' : 'seVolume'] ?? (type==='bgm'?0.45:0.9)); }
  function path(type, key){
    if(!key) return '';
    // URL（http...）や拡張子付きファイル名(.mp3等)ならそのまま使う
    if(/^https?:\/\//i.test(key) || /\.(mp3|wav|ogg|m4a)$/i.test(key)) return key;
    const files = settings.audioFiles || {};
    if(files[type] && files[type][key]) return files[type][key];
    if(type==='bgm' && files[key]) return files[key];
    return '';
  }
  function stopBgm(){ if(bgmAudio){ try{ bgmAudio.pause(); bgmAudio.currentTime=0; }catch(e){} } bgmAudio=null; currentKey=''; }
  function playBgm(key){
    if(!enabled || !key) return;
    if(currentKey === key && bgmAudio && !bgmAudio.paused) return;
    const src = path('bgm', key); if(!src) return;
    stopBgm(); currentKey = key;
    const a = new Audio(src); a.loop=true; a.volume=volume('bgm'); a.preload='auto';
    const p = a.play(); if(p && p.catch) p.catch(()=>{});
    bgmAudio = a;
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
  return {init, playBgm, stopBgm, playSe, play, mute};
})();
