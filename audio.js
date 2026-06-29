
window.GuildAudio = (() => {
  const bgm = {
    title:["冒険への誘い.mp3","冒険への誘い(2).mp3","冒険への誘い(1).mp3"],
    slime:["maou_bgm_fantasy15.mp3","maou_bgm_fantasy15(3).mp3","maou_bgm_fantasy15(2).mp3","maou_bgm_fantasy15(1).mp3"],
    goblin:["Baring_Their_Fangs.mp3","Baring_Their_Fangs(2).mp3","Baring_Their_Fangs(1).mp3"],
    orc:["反撃の一矢.mp3","反撃の一矢(1).mp3"],
    cave:["Rumbling.mp3","Rumbling(1).mp3"],
    ruins:["龍太鼓.mp3","龍太鼓(2).mp3","龍太鼓(1).mp3"],
    maou:["Extinguish.mp3","Extinguish(2).mp3","Extinguish(1).mp3"],
    ending:["March_for__delightful_future.mp3","March_for__delightful_future(1).mp3","March_for__delightful_future_light.mp3"]
  };
  const se = {
    ok:["maou_se_system37.mp3","maou_se_system37(1).mp3"],
    bad:["maou_se_system49.mp3","maou_se_system49(2).mp3","maou_se_system49(1).mp3"],
    cancel:["maou_se_system49.mp3","maou_se_system49(2).mp3","maou_se_system49(1).mp3"],
    add:["maou_se_onepoint16.mp3","maou_se_onepoint16(3).mp3","maou_se_onepoint16(2).mp3","maou_se_onepoint16(1).mp3"],
    confirm:["maou_se_system37.mp3","maou_se_system37(1).mp3"],
    damage:["maou_se_onepoint20.mp3","maou_se_onepoint20(2).mp3","maou_se_onepoint20(1).mp3"],
    hit:["maou_se_onepoint20.mp3","maou_se_onepoint20(2).mp3","maou_se_onepoint20(1).mp3"],
    defeat:["maou_se_system49.mp3","maou_se_system49(2).mp3","maou_se_system49(1).mp3"],
    levelup:["レベルアップ.mp3","レベルアップ(1).mp3","レベルアップ.mp3","レベルアップ(1).mp3"],
    victory:["RPG風ファンファーレ.mp3","ファンファーレ.mp3","ファンファーレ(1).mp3","ファンファーレ_light.mp3"]
  };
  let currentKey = "";
  let bgmAudio = null;
  let bgmVolume = 0.45;
  let seVolume = 0.90;
  let enabled = true;
  function listOf(map,key){ const v = map[key]; return Array.isArray(v) ? v : (v ? [v] : []); }
  function stopBgm(){ if(bgmAudio){ try{bgmAudio.pause(); bgmAudio.currentTime = 0;}catch(e){} } bgmAudio=null; currentKey=""; }
  function playFromList(list, loop, volume, onReady){
    let i=0;
    function tryOne(){
      if(i>=list.length) return null;
      const a = new Audio(list[i++]);
      a.preload = "auto"; a.loop = !!loop; a.volume = volume;
      a.onerror = tryOne;
      const p = a.play();
      if(p && p.catch) p.catch(()=>{});
      if(onReady) onReady(a);
      return a;
    }
    return tryOne();
  }
  function playBgm(key){
    if(!enabled || !key) return;
    if(currentKey === key && bgmAudio && !bgmAudio.paused) return;
    stopBgm(); currentKey = key;
    bgmAudio = playFromList(listOf(bgm,key), true, bgmVolume, a=>{ bgmAudio=a; });
  }
  function playSe(key){ if(enabled && key) playFromList(listOf(se,key), false, seVolume); }
  function play(key){
    const map = {ok:"ok", bad:"bad", cancel:"cancel", add:"add", confirm:"confirm", hit:"damage", damage:"damage", defeat:"defeat", levelup:"levelup", victory:"victory"};
    playSe(map[key] || key);
  }
  function setVolume(type, value){
    const v = Math.max(0, Math.min(1, Number(value)));
    if(type === "bgm"){ bgmVolume = v; if(bgmAudio) bgmAudio.volume = v; }
    if(type === "se") seVolume = v;
  }
  function mute(flag){ enabled = !flag; if(flag) stopBgm(); }
  return {playBgm, stopBgm, playSe, play, setVolume, mute};
})();
function isFinalEnemy(e){return !!e && (/maou/i.test(String(e.id||"")) || String(e.name||"").includes("魔王"));}
function bgmKeyForEnemy(e){
  const id=String((e&&e.id)||"").toLowerCase(); const name=String((e&&e.name)||""); const stage=String((e&&e.stage)||"");
  if(isFinalEnemy(e)) return "maou";
  if(id.includes("slime")||name.includes("スライム")) return "slime";
  if(id.includes("goblin")||name.includes("ゴブリン")) return "goblin";
  if(id.includes("orc")||name.includes("オーク")) return "orc";
  if(id.includes("skeleton")||id.includes("mimic")||name.includes("スケルトン")||name.includes("ミミック")||stage.includes("洞窟")) return "cave";
  if(id.includes("gargoyle")||id.includes("dark_wizard")||name.includes("ガーゴイル")||name.includes("ウィザード")||stage.includes("遺跡")) return "ruins";
  if(id.includes("minotaur")||name.includes("ミノタウロス")) return "goblin";
  if(id.includes("dragon")||name.includes("ドラゴン")) return "orc";
  return "slime";
}

