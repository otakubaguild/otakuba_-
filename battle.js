window.GuildBattlePresets = (() => {
  const PRESET_VERSION = "battle-preset-20260629-v1";

  function uid(prefix="enemy"){
    return `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;
  }

  function defaultEnemies(){
    return [
      {id:"slime_1", name:"スライム", stage:"草原", hp:500, maxHp:500, bg:"grass.png", background:"grass.png", image:"slime.png", bgm:"slime"},
      {id:"goblin_1", name:"ゴブリン 1/2", stage:"森", hp:750, maxHp:750, bg:"forest.png", background:"forest.png", image:"goblin.png", bgm:"goblin"},
      {id:"goblin_2", name:"ゴブリン 2/2", stage:"森", hp:750, maxHp:750, bg:"forest.png", background:"forest.png", image:"goblin.png", bgm:"goblin"},
      {id:"orc_1", name:"オーク", stage:"森", hp:1500, maxHp:1500, bg:"forest.png", background:"forest.png", image:"orc.png", bgm:"orc"},
      {id:"skeleton_1", name:"スケルトン 1/3", stage:"洞窟", hp:1000, maxHp:1000, bg:"cave.png", background:"cave.png", image:"skeleton.png", bgm:"cave"},
      {id:"skeleton_2", name:"スケルトン 2/3", stage:"洞窟", hp:1000, maxHp:1000, bg:"cave.png", background:"cave.png", image:"skeleton.png", bgm:"cave"},
      {id:"skeleton_3", name:"スケルトン 3/3", stage:"洞窟", hp:1000, maxHp:1000, bg:"cave.png", background:"cave.png", image:"skeleton.png", bgm:"cave"},
      {id:"mimic_1", name:"ミミック", stage:"洞窟", hp:1500, maxHp:1500, bg:"cave.png", background:"cave.png", image:"mimic.png", bgm:"cave"},
      {id:"minotaur_1", name:"ミノタウロス", stage:"洞窟", hp:3000, maxHp:3000, bg:"cave.png", background:"cave.png", image:"minotaur.png", bgm:"goblin"},
      {id:"gargoyle_1", name:"ガーゴイル 1/3", stage:"遺跡", hp:2500, maxHp:2500, bg:"ruins.png", background:"ruins.png", image:"gargoyle.png", bgm:"ruins"},
      {id:"gargoyle_2", name:"ガーゴイル 2/3", stage:"遺跡", hp:2500, maxHp:2500, bg:"ruins.png", background:"ruins.png", image:"gargoyle.png", bgm:"ruins"},
      {id:"gargoyle_3", name:"ガーゴイル 3/3", stage:"遺跡", hp:2500, maxHp:2500, bg:"ruins.png", background:"ruins.png", image:"gargoyle.png", bgm:"ruins"},
      {id:"dragon_1", name:"ドラゴン", stage:"火山", hp:10000, maxHp:10000, bg:"volcano.png", background:"volcano.png", image:"dragon.png", bgm:"orc"},
      {id:"dark_wizard_1", name:"ダークウィザード 1/2", stage:"魔王城", hp:2500, maxHp:2500, bg:"castle.png", background:"castle.png", image:"dark_wizard.png", bgm:"maou"},
      {id:"dark_wizard_2", name:"ダークウィザード 2/2", stage:"魔王城", hp:2500, maxHp:2500, bg:"castle.png", background:"castle.png", image:"dark_wizard.png", bgm:"maou"},
      {id:"maou_1", name:"魔王", stage:"魔王城", hp:15000, maxHp:15000, bg:"castle.png", background:"castle.png", image:"maou.png", bgm:"maou"}
    ];
  }

  function normalizeEnemy(e, index=0){
    const fallback = defaultEnemies()[index] || defaultEnemies()[0];
    e = e || {};
    const maxHp = Number(e.maxHp || e.hp || fallback.maxHp || 500) || 500;
    const hp = Number.isFinite(Number(e.hp)) ? Math.max(0, Number(e.hp)) : maxHp;
    const bg = e.bg || e.background || fallback.bg || "grass.png";
    return {
      id: e.id || fallback.id || uid(),
      name: e.name || e.monster || fallback.name || "敵",
      stage: e.stage || fallback.stage || "草原",
      hp,
      maxHp,
      bg,
      background: e.background || bg,
      image: e.image || fallback.image || "slime.png",
      bgm: e.bgm || fallback.bgm || "slime"
    };
  }

  function normalizeList(list){
    const arr = Array.isArray(list) && list.length ? list : defaultEnemies();
    return arr.map(normalizeEnemy);
  }

  function resetPreset(state){
    if(!state.settings) state.settings = {};
    state.settings.enemies = defaultEnemies();
    state.settings.currentEnemyIndex = 0;
    state.settings.battlePresetVersion = PRESET_VERSION;
    return state;
  }

  function needsPresetReset(state){
    return !state || !state.settings || state.settings.battlePresetVersion !== PRESET_VERSION;
  }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function applyDamage(total, done, api){
    let remaining = Math.max(0, Number(total) || 0);
    let defeatedAny = false;
    let finalDefeated = false;
    const $ = api.$;

    $("main")?.classList.add("combat-lock");
    api.showMain && api.showMain();

    async function step(){
      const e = api.enemy();
      if(!e || remaining <= 0){
        done && done(defeatedAny, finalDefeated);
        return;
      }

      e.maxHp = Number(e.maxHp || e.hp || 1);
      e.hp = Number.isFinite(Number(e.hp)) ? Number(e.hp) : e.maxHp;

      if(e.hp <= 0){
        if(api.isFinalEnemy(e)){
          done && done(defeatedAny, finalDefeated);
          return;
        }
        api.nextEnemy();
        await sleep(450);
        return step();
      }

      const chunk = Math.min(remaining, e.hp);
      remaining -= chunk;

      api.playSe && api.playSe("damage");

      const damagePop = $("damagePop");
      if(damagePop){
        damagePop.textContent = "-" + api.yen(chunk);
        damagePop.classList.remove("on");
        void damagePop.offsetWidth;
        damagePop.classList.add("on");
      }

      await sleep(420);
      e.hp = Math.max(0, Number(e.hp || 0) - chunk);
      api.renderMain();
      api.save();

      await sleep(930);

      if(e.hp <= 0){
        defeatedAny = true;
        const finalBoss = api.isFinalEnemy(e);
        if(finalBoss) finalDefeated = true;

        const defeatPop = $("defeatPop");
        if(defeatPop){
          defeatPop.textContent = finalBoss ? "魔王討伐！" : "撃破！";
          defeatPop.classList.add("on");
        }

        if(finalBoss){
          api.stopBgm && api.stopBgm();
          api.playSe && api.playSe("victory");
          setTimeout(() => api.playBgm && api.playBgm("ending"), 8300);
        }else{
          api.playSe && api.playSe("defeat");
        }

        await sleep(finalBoss ? 9200 : 1350);

        if(defeatPop) defeatPop.classList.remove("on");

        if(finalBoss){
          done && done(defeatedAny, finalDefeated);
        }else{
          api.nextEnemy();
          await sleep(650);
          return step();
        }
      }else{
        await sleep(450);
        return step();
      }
    }

    return step();
  }

  return {PRESET_VERSION, defaultEnemies, normalizeEnemy, normalizeList, resetPreset, needsPresetReset, applyDamage};
})();
