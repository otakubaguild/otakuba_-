window.GuildUI = (() => {
  const {$, esc} = GuildUtils;
  function toast(msg){ const t=$('toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),1600); }
  function closeModals(){ document.querySelectorAll('.modal').forEach(m=>m.classList.remove('active')); }
  function show(screenId){ closeModals(); document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); const el=$(screenId); if(el) el.classList.add('active'); }
  function openModal(id){ closeModals(); const el=$(id); if(el) el.classList.add('active'); }
  function applyBg(bg){ const page=$('pageBg'), battle=$('battleField'); const u = bg || 'background.jpg'; const pageBg=`linear-gradient(to bottom,rgba(0,0,0,.08),rgba(0,0,0,.20) 55%,rgba(0,0,0,.75)),url("${u}")`; const battleBg=`linear-gradient(to bottom,rgba(0,0,0,.04),rgba(0,0,0,.32)),url("${u}")`; if(page) page.style.backgroundImage=pageBg; if(battle) battle.style.backgroundImage=battleBg; }
  function renderNotice(settings){ const box=$('noticeBox'); if(!box)return; const n=settings.notice || {}; if(!n.enabled || !n.body){ box.innerHTML=''; return; } box.style.order = n.position === 'bottom' ? '2' : '-1'; box.innerHTML = `<div class="panel notice"><b class="goldtxt">📢 ${esc(n.title || '本日のお知らせ')}</b><div class="mt">${esc(n.body).replace(/\n/g,'<br>')}</div></div>`; }
  return {toast, show, openModal, closeModals, applyBg, renderNotice};
})();
