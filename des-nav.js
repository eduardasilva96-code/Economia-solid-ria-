// ================= CICLO, LIMPAR, NAVEGAÇÃO E IMPRESSÃO =================
(function () {
  document.querySelectorAll('.des-ciclo').forEach((s) => s.addEventListener('change', () => dash.setParams({ ciclo: s.value })));
  dash.onData(() => {
    document.querySelectorAll('.des-ciclo').forEach((s) => { if (document.activeElement !== s) s.value = dash.params().ciclo || ''; });
  });
  document.querySelectorAll('.des-clear').forEach((b) => b.addEventListener('click', () => dash.resetParams()));

  document.querySelectorAll('.des-prev, .des-next').forEach((b) => b.addEventListener('click', () => {
    if (desCal.y === null) return;
    const step = b.classList.contains('des-next') ? 1 : -1;
    const dt = new Date(Date.UTC(desCal.y, desCal.m + step, 1));
    desCal.y = dt.getUTCFullYear(); desCal.m = dt.getUTCMonth(); desCal.dia = null;
    desCalRedraw();
  }));
  document.querySelectorAll('.des-recent').forEach((b) => b.addEventListener('click', () => {
    const d = dash.data('base');
    if (d.status === 'ok') { desCalRecente(d.data); desCalRedraw(); }
  }));

  const tabs = () => [...document.querySelectorAll('.des-tab')];
  const pages = () => [...document.querySelectorAll('.des-page')];
  const show = (id, link) => {
    if (!pages().some((p) => p.id === id)) return false;
    pages().forEach((p) => { p.hidden = p.id !== id; });
    tabs().forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    if (link) dash.setLink(id);
    return true;
  };
  tabs().forEach((t) => t.addEventListener('click', () => show(t.dataset.tab, true)));
  document.querySelectorAll('.des-navcard').forEach((c) => c.addEventListener('click', () => show(c.dataset.go, true)));
  const h = (location.hash || '').replace('#', '');
  if (h) show(h, false);

  let antes = null;
  window.addEventListener('beforeprint', () => {
    if (antes === null) { const a = pages().find((p) => !p.hidden); antes = a ? a.id : 'inicio'; }
    pages().forEach((p) => { p.hidden = false; });
  });
  window.addEventListener('afterprint', () => { if (antes !== null) { show(antes, false); antes = null; } });
})();
