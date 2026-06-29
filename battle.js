window.GuildBattle = (() => {
  let rawMonsters = [];
  let monsters = [];
  let state = null;

  function normalizeMonster(m, groupIndex, countIndex = 0){
    const name = m.name || m.monster || "敵";
    const count = Math.max(1, Number(m.count || 1));
    const maxHp = Number(m.maxHp || m.hp || 500);

    return {
      id: m.id ? `${m.id}_${countIndex + 1}` : `monster_${groupIndex + 1}_${countIndex + 1}`,
      baseId: m.id || `monster_${groupIndex + 1}`,
      name: count > 1 ? `${name} ${countIndex + 1}/${count}` : name,
      baseName: name,
      stage: m.stage || "",
      background: m.background || m.bg || "grass.png",
      image: m.image || "",
      bgm: m.bgm || "",
      hp: maxHp,
      maxHp: maxHp,
      boss: !!m.boss
    };
  }

  function expandMonsters(data){
    const list = Array.isArray(data) ? data : [];
    const expanded = [];

    list.forEach((m, i) => {
      const count = Math.max(1, Number(m.count || 1));
      for(let n = 0; n < count; n++){
        expanded.push(normalizeMonster(m, i, n));
      }
    });

    return expanded;
  }

  function initial(){
    const first = monsters[0];
    return {
      index: 0,
      hp: first ? first.maxHp : 500,
      defeated: [],
      totalDamage: 0
    };
  }

  function load(){
    state = GuildStorage.get(GuildStorage.keys.battle, null);

    if(!state || !Number.isFinite(Number(state.index))){
      state = initial();
    }

    state.index = Math.max(
      0,
      Math.min(Number(state.index || 0), Math.max(0, monsters.length - 1))
    );

    const m = current();

    if(m && (!Number.isFinite(Number(state.hp)) || Number(state.hp) <= 0)){
      state.hp = m.maxHp;
    }

    return state;
  }

  function save(){
    GuildStorage.set(GuildStorage.keys.battle, state);
  }

  function current(){
    return monsters[Math.min(state?.index || 0, monsters.length - 1)] || monsters[0];
  }

  function bgPath(m){
    return `${m.background || m.bg || "grass.png"}`;
  }

  function monsterPath(m){
    return `${m.image || ""}`;
  }

  function setBackground(m){
    const bg = document.getElementById("appBg") || document.getElementById("pageBg");
    const battleField = document.getElementById("battleField");

    if(!m) return;

    const image =
      `linear-gradient(to bottom,rgba(0,0,0,.02),rgba(0,0,0,.12) 50%,rgba(0,0,0,.78) 86%),url("${bgPath(m)}")`;

    if(bg) bg.style.backgroundImage = image;
    if(battleField) battleField.style.backgroundImage = image;
  }

  function playBgmFor(m){
    if(!m || !window.GuildAudio) return;

    if(typeof GuildAudio.playBgm === "function" && m.bgm){
      GuildAudio.playBgm(m.bgm);
    }
  }

  function playSe(type){
    if(!window.GuildAudio) return;

    if(typeof GuildAudio.playSe === "function"){
      GuildAudio.playSe(type);
    }else if(typeof GuildAudio.play === "function"){
      GuildAudio.play(type);
    }
  }

  function setText(id, value){
    const el = document.getElementById(id);
    if(el) el.textContent = value;
  }

  function renderBattle(){
    const m = current();
    if(!m) return;

    setBackground(m);
    playBgmFor(m);

    const hp = Math.max(0, Number(state.hp || 0));
    const maxHp = Number(m.maxHp || m.hp || 1);

    setText("battleStage", m.stage || "");
    setText("battleEnemyName", m.name || "敵");
    setText("enemyName", m.name || "敵");
    setText("enemyHpText", `HP ${hp} / ${maxHp}`);
    setText("battleHpText", `${hp} / ${maxHp}`);

    const fill = document.getElementById("battleHpFill") || document.getElementById("enemyHpFill");
    if(fill){
      fill.style.width = `${Math.max(0, Math.min(100, hp / maxHp * 100))}%`;
    }

    const img = document.getElementById("battleEnemy");
    const sprite = document.getElementById("enemySprite");
    const fallback = document.getElementById("battleFallback");

    if(img){
      img.src = monsterPath(m);
      img.classList.remove("hidden", "battle-hit", "battle-defeat");

      img.onerror = () => {
        img.classList.add("hidden");
        if(fallback) fallback.classList.remove("hidden");
      };

      img.onload = () => {
        if(fallback) fallback.classList.add("hidden");
      };
    }

    if(sprite){
      const image = monsterPath(m);
      sprite.innerHTML = image
        ? `<img src="${image}" alt="${m.name}" onerror="this.replaceWith(document.createTextNode('👾'))">`
        : "👾";
    }

    save();
  }

  function sleep(ms){
    return new Promise(r => setTimeout(r, ms));
  }

  async function showDamage(amount){
    const img = document.getElementById("battleEnemy") || document.getElementById("enemySprite");
    const damagePop = document.getElementById("damagePop");

    if(img){
      img.classList.remove("battle-hit");
      void img.offsetWidth;
      img.classList.add("battle-hit");
    }

    if(damagePop){
      damagePop.textContent = `${amount} DAMAGE!`;
      damagePop.classList.remove("hidden", "on");
      void damagePop.offsetWidth;
      damagePop.classList.add("on");
    }

    playSe("hit");
    playSe("damage");

    await sleep(850);

    if(damagePop){
      damagePop.classList.add("hidden");
      damagePop.classList.remove("on");
    }
  }

  async function showDefeat(){
    const img = document.getElementById("battleEnemy") || document.getElementById("enemySprite");
    const defeatPop = document.getElementById("defeatPop");

    if(img){
      img.classList.remove("battle-hit");
      img.classList.add("battle-defeat");
    }

    if(defeatPop){
      defeatPop.classList.remove("hidden", "on");
      void defeatPop.offsetWidth;
      defeatPop.classList.add("on");
    }

    playSe("defeat");

    await sleep(1200);

    if(defeatPop){
      defeatPop.classList.add("hidden");
      defeatPop.classList.remove("on");
    }
  }

  async function attack(amount){
    load();

    let rest = Math.max(0, Number(amount || 0));
    if(rest <= 0){
      return { defeated: false, damage: 0 };
    }

    let defeatedAny = false;
    const total = rest;

    while(rest > 0 && state.index < monsters.length){
      const m = current();
      if(!m) break;

      renderBattle();
      await sleep(280);

      const currentHp = Number(state.hp || m.maxHp);
      const damage = Math.min(rest, currentHp);

      state.hp = Math.max(0, currentHp - damage);
      state.totalDamage += damage;
      rest -= damage;

      await showDamage(damage);

      save();
      renderBattle();

      if(state.hp <= 0){
        defeatedAny = true;

        state.defeated.push({
          id: m.id,
          name: m.name,
          stage: m.stage,
          at: new Date().toISOString()
        });

        await showDefeat();

        state.index++;

        if(state.index < monsters.length){
          const next = current();
          state.hp = next.maxHp;

          save();
          renderBattle();

          await sleep(650);
        }else{
          state.hp = 0;
          save();

          if(window.GuildAudio){
            if(typeof GuildAudio.stopBgm === "function"){
              GuildAudio.stopBgm();
            }

            if(typeof GuildAudio.playSe === "function"){
              GuildAudio.playSe("fanfare");
            }else if(typeof GuildAudio.play === "function"){
              GuildAudio.play("defeat");
            }
          }

          break;
        }
      }else{
        save();
        await sleep(350);
      }
    }

    renderBattle();

    return {
      defeated: defeatedAny,
      damage: total,
      remaining: rest
    };
  }

  function reset(){
    state = initial();
    save();
    renderBattle();
  }

  function init(data){
    rawMonsters = Array.isArray(data) ? data : [];
    monsters = expandMonsters(rawMonsters);

    state = initial();

    const saved = GuildStorage.get(GuildStorage.keys.battle, null);

    if(saved && Number.isFinite(Number(saved.index))){
      state = saved;

      if(state.index >= monsters.length){
        state.index = 0;
      }

      const m = current();

      if(m && (!Number.isFinite(Number(state.hp)) || Number(state.hp) <= 0)){
        state.hp = m.maxHp;
      }
    }

    save();
    renderBattle();
  }

  return {
    init,
    attack,
    current,
    setBackground,
    load,
    save,
    reset,
    renderBattle,
    expandMonsters
  };
})();
