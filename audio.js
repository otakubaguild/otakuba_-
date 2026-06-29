window.GuildAudio = (() => {
  let settings = {}; let bgmAudio = null; let currentKey = ''; let enabled = true;
  function init(s){ settings = s || {}; }
  function volume(type){ return Number(settings[type === 'bgm' ? 'bgmVolume' : 'seVolume'] ?? (type==='bgm'?0.45:0.9)); }
  function path(type, key){ return settings.audioFiles && settings.audioFiles[type] && settings.audioFiles[type][key]; }
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
  function playSe(key){
    if(!enabled || !key) return; const src = path('se', key); if(!src) return;
    const a = new Audio(src); a.loop=false; a.volume=volume('se');
    const p = a.play(); if(p && p.catch) p.catch(()=>{});
  }
  function play(key){ const map={ok:'ok',bad:'bad',cancel:'cancel',add:'add',confirm:'confirm',hit:'damage',damage:'damage',defeat:'defeat',levelup:'levelup',victory:'victory'}; playSe(map[key]||key); }
  function mute(flag){ enabled = !flag; if(flag) stopBgm(); }
  return {init, playBgm, stopBgm, playSe, play, mute};
})();
