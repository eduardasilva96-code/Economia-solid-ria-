// Camada mínima que imita a API do painel (dash.*) para rodar como site estático.
(function () {
  const ARQUIVOS = { acoes: 'data/acoes.csv', indicadores: 'data/indicadores.csv', territorios: 'data/territorios.csv' };
  const PADRAO = { territorio: '', ciclo: '', agente: '' };
  const fontes = {};          // id -> linhas
  const calcs = [];           // [{id, inputs, fn}]
  const valores = {};         // id -> resultado
  const desenhos = {};        // nome -> fn
  const ouvintes = [];
  let params = Object.assign({}, PADRAO);
  let pronto = false;
  let erro = false;

  function recalcular() {
    calcs.forEach((c) => {
      try {
        valores[c.id] = c.fn(...c.inputs.map((i) => (i in fontes ? fontes[i] : valores[i])));
      } catch (e) { console.error('Cálculo', c.id, e); valores[c.id] = []; }
    });
  }

  function desenhar(nome) {
    const nomes = nome ? [nome] : Object.keys(desenhos);
    nomes.forEach((n) => {
      document.querySelectorAll(`[data-draw="${n}"]`).forEach((el) => {
        if (el.closest('[hidden]')) return;
        try { desenhos[n](el); } catch (e) { console.error('Desenho', n, e); }
      });
    });
  }

  function atualizar() {
    if (pronto) recalcular();
    ouvintes.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    desenhar();
  }

  window.dash = {
    calc(id, def) { calcs.push({ id, inputs: def.inputs, fn: def.fn }); },
    loader() {},
    data(id) {
      if (erro) return { status: 'error', data: [] };
      if (!pronto) return { status: 'loading', data: [] };
      if (id in fontes) return { status: 'ok', data: fontes[id] };
      if (id in valores) return { status: 'ok', data: valores[id] };
      return { status: 'missing', data: [] };
    },
    draw(nome, fn) {
      if (fn) { desenhos[nome] = typeof fn === 'function' ? fn : (el) => fn.update(el, fn.mount && fn.mount(el)); }
      else desenhar(nome);
    },
    onData(fn) { ouvintes.push(fn); fn(); },
    params() { return Object.assign({}, params); },
    setParams(p) { params = Object.assign({}, params, p); atualizar(); },
    resetParams() { params = Object.assign({}, PADRAO); atualizar(); },
    setLink(id) { if (history.replaceState) history.replaceState(null, '', '#' + id); },
    refresh() {},
    colors: ['#00663A', '#2DB36F', '#F7C600', '#004D2B']
  };

  // Redesenha quando uma página aparece (atributo hidden muda) ou a janela muda de tamanho.
  document.addEventListener('DOMContentLoaded', () => {
    const mo = new MutationObserver(() => desenhar());
    document.querySelectorAll('.des-page').forEach((pg) => mo.observe(pg, { attributes: true, attributeFilter: ['hidden'] }));
  });
  let t = null;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => desenhar(), 150); });

  Promise.all(Object.entries(ARQUIVOS).map(([id, url]) => d3.csv(url).then((linhas) => {
    fontes[id] = linhas.map((r) => { const o = {}; Object.keys(r).forEach((k) => { o[k] = r[k] === '' ? null : r[k]; }); return o; });
  }))).then(() => { pronto = true; atualizar(); })
    .catch((e) => { console.error(e); erro = true; atualizar(); });

  // Primeiro desenho (estado "carregando") depois que todos os scripts rodarem.
  window.addEventListener('DOMContentLoaded', () => desenhar());
})();
