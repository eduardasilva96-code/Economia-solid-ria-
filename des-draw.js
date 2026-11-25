// ================= NÚMEROS, TEXTOS E FILTROS =================
['num', 'txt'].forEach((name) => dash.draw(name, (el) => {
  const d = dash.data(el.dataset.source);
  const row = d.status === 'ok' && Array.isArray(d.data) ? d.data[Number(el.dataset.row || 0)] : null;
  if (!row) { el.classList.toggle('dash-skeleton', d.status === 'loading'); el.textContent = '—'; return; }
  el.classList.remove('dash-skeleton');
  const final = DES.fmt(row[el.dataset.field], el.dataset.fmt);
  const alvo = Number(row[el.dataset.field]);
  const mover = el.classList.contains('des-countup') && !el.dataset.contou && isFinite(alvo) && alvo > 0
    && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!mover) { el.textContent = final; return; }
  el.dataset.contou = '1';
  const t0 = performance.now(), dur = 1400;
  const passo = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = p < 1 ? DES.nf.format(Math.round(alvo * e)) : final;
    if (p < 1) requestAnimationFrame(passo);
  };
  el.textContent = DES.nf.format(0);
  requestAnimationFrame(passo);
}));

dash.draw('proximo', (el) => {
  const d = dash.data('proximo');
  if (d.status !== 'ok') { el.classList.toggle('dash-skeleton', d.status === 'loading'); el.textContent = '—'; return; }
  el.classList.remove('dash-skeleton');
  el.textContent = d.data.length ? DES.dataBR(d.data[0].data) + ' · ' + d.data[0].territorio : 'Nenhum agendado';
});

dash.draw('f_terr', (sel) => {
  const d = dash.data('acoes');
  const ts = d.status === 'ok' ? [...new Set(d.data.filter((r) => r.status === 'Válido').map((r) => r.territorio))].sort((a, b) => a.localeCompare(b, 'pt-BR')) : [];
  sel.replaceChildren(new Option('Todos', ''), ...ts.map((t) => new Option(t, t)));
  sel.value = dash.params().territorio || '';
  sel.onchange = () => dash.setParams({ territorio: sel.value });
});

dash.draw('f_ciclo', (sel) => {
  const d = dash.data('acoes');
  const cs = d.status === 'ok' ? [...new Set(d.data.filter((r) => r.status === 'Válido' && r.ciclo).map((r) => r.ciclo))].sort() : [];
  sel.replaceChildren(new Option('Todos', ''), ...cs.map((c) => new Option(c, c)));
  sel.value = dash.params().ciclo || '';
  sel.onchange = () => dash.setParams({ ciclo: sel.value });
});

dash.draw('f_agente', (sel) => {
  const d = dash.data('acoes');
  const ag = d.status === 'ok' ? [...new Set(d.data.filter((r) => r.status === 'Válido' && r.pesquisador).map((r) => r.pesquisador))].sort((a, b) => a.localeCompare(b, 'pt-BR')) : [];
  sel.replaceChildren(new Option('Todos', ''), ...ag.map((a) => new Option(a, a)));
  sel.value = dash.params().agente || '';
  sel.onchange = () => dash.setParams({ agente: sel.value });
});

// ================= CALENDÁRIO E LISTA =================
window.desCal = { y: null, m: null, dia: null };
window.desHoje = new Date().toISOString().slice(0, 10);
window.desCalRecente = (rows) => {
  const datas = rows.map((r) => r.data_atividade).sort();
  const futuras = datas.filter((x) => x >= desHoje);
  const alvo = futuras[0] || datas[datas.length - 1] || desHoje;
  desCal.y = Number(alvo.slice(0, 4)); desCal.m = Number(alvo.slice(5, 7)) - 1; desCal.dia = null;
};
window.desCalRedraw = () => { ['cal', 'cal_titulo', 't_lista', 'lista_info'].forEach((n) => dash.draw(n)); };

dash.draw('cal_titulo', (el) => {
  el.textContent = desCal.y === null ? '—' : DES.MESES_LONGOS[desCal.m] + ' de ' + desCal.y;
});

dash.draw('cal', (el) => {
  const d = dash.data('base');
  if (d.status === 'loading') { el.replaceChildren(); el.classList.add('dash-skeleton'); return; }
  el.classList.remove('dash-skeleton');
  if (d.status !== 'ok') { el.replaceChildren(); return; }
  const rows = d.data;
  if (desCal.y === null) { desCalRecente(rows); dash.draw('cal_titulo'); dash.draw('t_lista'); dash.draw('lista_info'); }
  const by = {};
  rows.forEach((r) => { (by[r.data_atividade] = by[r.data_atividade] || []).push(r); });
  const y = desCal.y, m = desCal.m;
  const first = new Date(Date.UTC(y, m, 1));
  const start = new Date(Date.UTC(y, m, 1 - first.getUTCDay()));
  const nDays = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const weeks = Math.ceil((first.getUTCDay() + nDays) / 7);
  const grid = document.createElement('div');
  grid.className = 'des-calgrid';
  ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'].forEach((w) => { const c = document.createElement('div'); c.className = 'des-wd'; c.textContent = w; grid.appendChild(c); });
  for (let i = 0; i < weeks * 7; i += 1) {
    const dt = new Date(start.getTime() + i * 86400000);
    const iso = dt.toISOString().slice(0, 10);
    const evs = by[iso] || [];
    const wrap = document.createElement('div');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'des-day' + (dt.getUTCMonth() !== m ? ' out' : '') + (iso === desHoje ? ' today' : '') + (evs.length ? ' has' : '') + (desCal.dia === iso ? ' sel' : '');
    const dn = document.createElement('span'); dn.className = 'des-dn'; dn.textContent = dt.getUTCDate();
    b.appendChild(dn);
    evs.slice(0, 2).forEach((r) => { const e = document.createElement('span'); e.className = 'des-ev'; e.textContent = r.territorio; b.appendChild(e); });
    if (evs.length > 2) { const e = document.createElement('span'); e.className = 'des-ev more'; e.textContent = '+' + (evs.length - 2) + ' encontros'; b.appendChild(e); }
    if (evs.length) {
      b.setAttribute('aria-label', DES.dataBR(iso) + ': ' + evs.length + (evs.length > 1 ? ' encontros' : ' encontro'));
      b.addEventListener('click', () => {
        if (dt.getUTCMonth() !== m) { desCal.y = dt.getUTCFullYear(); desCal.m = dt.getUTCMonth(); }
        desCal.dia = desCal.dia === iso ? null : iso;
        desCalRedraw();
      });
    } else { b.tabIndex = -1; }
    wrap.appendChild(b);
    grid.appendChild(wrap);
  }
  el.replaceChildren(grid);
});

window.desListaFiltrada = () => {
  const d = dash.data('lista');
  if (d.status !== 'ok' || desCal.y === null) return null;
  const pref = desCal.y + '-' + String(desCal.m + 1).padStart(2, '0');
  return d.data.filter((r) => (desCal.dia ? r.data_iso === desCal.dia : r.data_iso.startsWith(pref)));
};

dash.draw('lista_info', (el) => {
  const rows = desListaFiltrada();
  if (rows === null) { el.textContent = '—'; return; }
  const periodo = desCal.dia ? 'do dia ' + DES.dataBR(desCal.dia) : 'de ' + DES.MESES_LONGOS[desCal.m] + ' de ' + desCal.y;
  const s = document.createElement('span');
  s.className = 'des-sub';
  s.textContent = rows.length ? 'Encontros ' + periodo + ', do mais novo para o mais antigo' : 'Nenhum encontro ' + periodo + '. Use as setas ou “Mais recente”.';
  const parts = [s];
  if (desCal.dia) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'des-btn'; b.textContent = 'Ver o mês inteiro';
    b.addEventListener('click', () => { desCal.dia = null; desCalRedraw(); });
    parts.push(b);
  }
  el.replaceChildren(...parts);
});

dash.draw('t_lista', (tb) => {
  const rows = desListaFiltrada() || [];
  tb.replaceChildren(...rows.map((r) => {
    const tr = document.createElement('tr');
    tr.dataset.key = r.registro;
    const cell = (t, cls) => { const td = document.createElement('td'); if (cls) td.className = cls; td.textContent = t; return td; };
    const tag = document.createElement('td');
    const sp = document.createElement('span'); sp.className = 'des-tag' + (r.parceria === 'Sim' ? '' : ' no'); sp.textContent = r.parceria;
    tag.appendChild(sp);
    tr.append(cell(r.data, 'n'), cell(r.dia_semana), cell(r.inicio || '—', 'n'), cell(r.termino || '—', 'n'), cell(r.territorio),
      cell(r.local || '—'), cell(r.endereco || '—', 'des-end'), cell(r.agente || '—'), cell(r.contato || '—', 'n'), tag);
    return tr;
  }));
});

// ================= GRÁFICOS =================
dash.draw('ch_mes', (el) => {
  const d = dash.data('por_mes');
  const rows = d.status === 'ok' ? d.data : [];
  if (DES.state(el, d, rows)) return;
  const W = Math.max(240, el.clientWidth || 320), H = 220;
  const svg = d3.create('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Colunas com o número de encontros por mês');
  el.replaceChildren(svg.node());
  const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.n) || 1]).nice(4);
  const ticks = y.ticks(4).filter(Number.isInteger);
  const left = DES.measure(svg, ticks.map((t) => DES.nf.format(t))) + 8;
  const m = { t: 18, r: 4, b: 24, l: left };
  y.range([H - m.b, m.t]);
  const x = d3.scaleBand().domain(rows.map((r) => r.mes)).range([m.l, W - m.r]).padding(0.2);
  ticks.forEach((t) => {
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).style('stroke', t === 0 ? '#9AA59F' : '#E6EAE7');
    svg.append('text').attr('x', m.l - 6).attr('y', y(t)).attr('dy', '0.35em').attr('text-anchor', 'end').text(DES.nf.format(t));
  });
  const tip = DES.tip(el);
  const g = svg.selectAll('g.c').data(rows).join('g').attr('class', 'c');
  g.append('rect').attr('x', (r) => x(r.mes) - (x.step() - x.bandwidth()) / 2).attr('y', m.t).attr('width', x.step()).attr('height', H - m.b - m.t).attr('fill', 'transparent');
  g.append('rect').attr('x', (r) => x(r.mes)).attr('width', x.bandwidth()).attr('rx', 2).attr('y', (r) => y(r.n)).attr('height', (r) => y(0) - y(r.n))
    .style('fill', (r) => (r.mes >= '2026-01' ? DES.verdeClaro : DES.verde));
  if (x.bandwidth() >= 16) g.filter((r) => r.n > 0).append('text').attr('class', 'des-val').attr('x', (r) => x(r.mes) + x.bandwidth() / 2).attr('y', (r) => y(r.n) - 5).attr('text-anchor', 'middle').text((r) => r.n);
  let lastEnd = -Infinity;
  rows.forEach((r) => {
    if (!(['01', '04', '07', '10'].includes(r.mes.slice(5)) || rows.length <= 8)) return;
    const cx = x(r.mes) + x.bandwidth() / 2;
    const t = svg.append('text').attr('x', cx).attr('y', H - 6).attr('text-anchor', 'middle').text(DES.mes(r.mes));
    const w = t.node().getComputedTextLength();
    if (cx - w / 2 < lastEnd + 6 || cx + w / 2 > W) t.remove(); else lastEnd = cx + w / 2;
  });
  g.on('pointermove', (ev, r) => tip.show(ev, [['Mês', DES.mes(r.mes)], ['Encontros', DES.nf.format(r.n)]])).on('pointerleave', () => tip.hide());
});

dash.draw('ch_inst', (el) => {
  const d = dash.data('instituicoes');
  const rows = d.status === 'ok' ? d.data : [];
  if (DES.state(el, d, rows)) return;
  DES.hbar(el, rows, {
    label: 'instituicao', value: 'n', aria: 'Barras com as instituições parceiras por número de encontros',
    fmt: (r) => DES.nf.format(r.n), tip: (r) => [['Parceiro', r.instituicao], ['Encontros', DES.nf.format(r.n)]]
  });
});

dash.draw('ch_turno', (el) => {
  const d = dash.data('turno_terr');
  const rows = d.status === 'ok' ? d.data : [];
  if (DES.state(el, d, rows)) return;
  const turnos = ['Manhã', 'Tarde', 'Noite'];
  const tot = {};
  rows.forEach((r) => { tot[r.territorio] = (tot[r.territorio] || 0) + r.n; });
  const ters = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  const max = d3.max(rows, (r) => r.n) || 1;
  const W = Math.max(240, el.clientWidth || 320), ch = 30, top = 22, H = top + ters.length * (ch + 4);
  const svg = d3.create('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Mapa de calor com encontros por território e turno');
  el.replaceChildren(svg.node());
  const lw = Math.min(DES.measure(svg, ters), W * 0.4);
  const left = lw + 10, cw = (W - left) / 3;
  turnos.forEach((t, j) => svg.append('text').attr('x', left + j * cw + cw / 2).attr('y', 12).attr('text-anchor', 'middle').text(t));
  const tip = DES.tip(el);
  ters.forEach((te, i) => {
    const yy = top + i * (ch + 4);
    svg.append('text').attr('x', left - 10).attr('y', yy + ch / 2).attr('dy', '0.35em').attr('text-anchor', 'end').text(te);
    turnos.forEach((tu, j) => {
      const r = rows.find((x) => x.territorio === te && x.turno === tu) || { n: 0 };
      const k = r.n / max;
      const g = svg.append('g');
      g.append('rect').attr('x', left + j * cw + 2).attr('y', yy).attr('width', cw - 4).attr('height', ch).attr('rx', 4)
        .style('fill', r.n ? DES.verde : '#EEF1EF').style('fill-opacity', r.n ? 0.15 + 0.85 * k : 1);
      g.append('text').attr('class', 'des-val').attr('x', left + j * cw + cw / 2).attr('y', yy + ch / 2).attr('dy', '0.35em').attr('text-anchor', 'middle')
        .style('fill', k > 0.5 ? '#fff' : null).text(DES.nf.format(r.n));
      g.on('pointermove', (ev) => tip.show(ev, [['Território', te], ['Turno', tu], ['Encontros', DES.nf.format(r.n)], ['Do território', Math.round(r.n / tot[te] * 100) + '%']]))
        .on('pointerleave', () => tip.hide());
    });
  });
});

dash.draw('ch_mapa', (el) => {
  const d = dash.data('mapa');
  const rows = d.status === 'ok' ? d.data : [];
  if (DES.state(el, d, rows)) return;
  const lon0 = -48.24, lon1 = -47.58, lat0 = -15.94, lat1 = -15.56;
  const W = Math.max(260, el.clientWidth || 320);
  const H = Math.round(W * ((lat1 - lat0) / ((lon1 - lon0) * Math.cos(15.75 * Math.PI / 180))));
  const px = (lon) => (lon - lon0) / (lon1 - lon0) * W;
  const py = (lat) => (lat1 - lat) / (lat1 - lat0) * H;
  const svg = d3.create('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Mapa esquemático do DF com bolhas proporcionais ao número de encontros por território');
  el.replaceChildren(svg.node());
  svg.append('rect').attr('width', W).attr('height', H).attr('rx', 10).style('fill', '#EEF6F0');
  for (let i = 1; i < 6; i += 1) svg.append('line').attr('x1', W * i / 6).attr('x2', W * i / 6).attr('y1', 0).attr('y2', H).style('stroke', '#DCE8DF');
  for (let i = 1; i < 4; i += 1) svg.append('line').attr('x1', 0).attr('x2', W).attr('y1', H * i / 4).attr('y2', H * i / 4).style('stroke', '#DCE8DF');
  const ppx = px(-47.882), ppy = py(-15.794);
  svg.append('path').attr('d', d3.symbol(d3.symbolStar, 90)()).attr('transform', `translate(${ppx},${ppy})`).style('fill', DES.amarelo).style('stroke', DES.verdeEsc);
  svg.append('text').attr('x', ppx).attr('y', ppy + 20).attr('text-anchor', 'middle').style('font-style', 'italic').text('Plano Piloto');
  const r = d3.scaleSqrt().domain([0, d3.max(rows, (x) => x.n) || 1]).range([0, Math.max(12, W / 22)]);
  const nodes = rows.map((x) => ({ ...x, x: px(x.lon), y: py(x.lat), x0: px(x.lon), y0: py(x.lat), r: Math.max(6, r(x.n)) }));
  const sim = d3.forceSimulation(nodes).force('x', d3.forceX((n) => n.x0).strength(0.4)).force('y', d3.forceY((n) => n.y0).strength(0.4))
    .force('c', d3.forceCollide((n) => n.r + 3)).stop();
  for (let i = 0; i < 160; i += 1) sim.tick();
  nodes.forEach((n) => { n.x = Math.max(n.r, Math.min(W - n.r, n.x)); n.y = Math.max(n.r, Math.min(H - n.r, n.y)); });
  const tip = DES.tip(el);
  const sel = dash.params().territorio || '';
  const g = svg.selectAll('g.b').data(nodes).join('g').attr('class', 'b').style('cursor', 'pointer');
  g.append('circle').attr('cx', (n) => n.x).attr('cy', (n) => n.y).attr('r', (n) => n.r)
    .style('fill', DES.verde).style('fill-opacity', (n) => (!sel || sel === n.territorio ? 0.88 : 0.3)).style('stroke', '#fff').style('stroke-width', 2);
  g.append('text').attr('class', 'des-val').attr('x', (n) => n.x).attr('y', (n) => n.y).attr('dy', '0.35em').attr('text-anchor', 'middle')
    .style('fill', '#fff').text((n) => (n.r >= 11 ? n.n : ''));
  const lado = (n) => (n.rotulo === 'direita' ? 'start' : n.x < 70 ? 'start' : n.x > W - 70 ? 'end' : 'middle');
  g.append('text')
    .attr('x', (n) => (n.rotulo === 'direita' ? n.x + n.r + 4 : n.x < 70 ? Math.max(2, n.x - n.r) : n.x > W - 70 ? Math.min(W - 2, n.x + n.r) : n.x))
    .attr('y', (n) => (n.rotulo === 'acima' ? n.y - n.r - 6 : n.rotulo === 'direita' ? n.y + 4 : n.y + n.r + 14))
    .attr('text-anchor', lado)
    .style('fill', DES.verdeEsc).style('font-weight', 600).style('paint-order', 'stroke').style('stroke', '#EEF6F0').style('stroke-width', 4)
    .each(function (n) {
      const t = d3.select(this);
      const linhas = n.territorio.length > 14 && n.territorio.includes('/') ? [n.territorio.split('/')[0] + '/', n.territorio.split('/').slice(1).join('/')] : [n.territorio];
      const x = t.attr('x');
      const y0 = n.rotulo === 'acima' ? Number(t.attr('y')) - (linhas.length - 1) * 14 : Number(t.attr('y'));
      linhas.forEach((l, i) => t.append('tspan').attr('x', x).attr('y', y0 + i * 14).text(l));
    });
  g.on('pointermove', (ev, n) => tip.show(ev, [['Território', n.territorio], ['Encontros', DES.nf.format(n.n)]])).on('pointerleave', () => tip.hide())
    .on('click', (ev, n) => dash.setParams({ territorio: sel === n.territorio ? '' : n.territorio }));
});
