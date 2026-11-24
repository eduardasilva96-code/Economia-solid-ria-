// ================= AJUDANTES =================
(function () {
  const nf = new Intl.NumberFormat('pt-BR');
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  window.DES = {
    nf,
    verde: '#00663A', verdeEsc: '#004D2B', verdeClaro: '#2DB36F', amarelo: '#F7C600',
    MESES,
    MESES_LONGOS: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    mes: (k) => { const [y, m] = k.split('-'); return MESES[Number(m) - 1] + '/' + y.slice(2); },
    dataBR: (iso) => { const [y, m, d] = String(iso).split('-'); return d + '/' + m + '/' + y; },
    fmt: (v, f) => {
      if (v === null || v === undefined || v === '') return '—';
      if (f === 'pct') return nf.format(v) + '%';
      if (f === 'data') return DES.dataBR(v);
      if (typeof v === 'number') return nf.format(v);
      if (/^-?\d+(\.\d+)?$/.test(String(v))) return nf.format(Number(v));
      return String(v);
    },
    state: (el, d, rows) => {
      const msg = (t) => { const p = document.createElement('p'); p.className = 'des-msg'; p.textContent = t; return p; };
      if (d.status === 'loading') { el.replaceChildren(); el.classList.add('dash-skeleton'); return true; }
      el.classList.remove('dash-skeleton');
      if (d.status === 'error' || d.status === 'missing') { el.replaceChildren(msg('Não foi possível carregar este gráfico.')); return true; }
      if (d.status !== 'ok') { el.replaceChildren(); return true; }
      if (!rows || !rows.length) { el.replaceChildren(msg('Nenhum encontro para os filtros escolhidos.')); return true; }
      return false;
    },
    tip: (el) => {
      const t = document.createElement('div');
      t.className = 'des-tip'; t.hidden = true; el.appendChild(t);
      return {
        show(ev, lines) {
          t.replaceChildren(...lines.map(([k, v]) => {
            const row = document.createElement('div');
            if (k) { const s = document.createElement('span'); s.className = 'des-tip-k'; s.textContent = k + ': '; row.appendChild(s); }
            row.appendChild(document.createTextNode(v));
            return row;
          }));
          t.hidden = false;
          const r = el.getBoundingClientRect();
          let x = ev.clientX - r.left + 12;
          const w = t.offsetWidth;
          if (x + w > r.width) x = Math.max(0, ev.clientX - r.left - w - 12);
          t.style.left = x + 'px'; t.style.top = (ev.clientY - r.top + 12) + 'px';
        },
        hide() { t.hidden = true; }
      };
    },
    measure: (svg, texts, cls) => {
      const g = svg.append('g'); let w = 0;
      texts.forEach((s) => { const t = g.append('text').attr('class', cls || null).text(s); w = Math.max(w, t.node().getComputedTextLength()); });
      g.remove(); return w;
    },
    hbar: (el, rows, o) => {
      const W = Math.max(240, el.clientWidth || 320), bh = 24, gap = 8, H = rows.length * (bh + gap);
      const svg = d3.create('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', o.aria);
      el.replaceChildren(svg.node());
      const lw = Math.min(DES.measure(svg, rows.map((r) => r[o.label])), W * 0.45);
      const vw = DES.measure(svg, rows.map(o.fmt), 'des-val');
      const left = lw + 10;
      const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => Number(r[o.value])) || 1]).range([0, Math.max(10, W - left - vw - 8)]);
      const tip = DES.tip(el);
      const g = svg.selectAll('g.r').data(rows).join('g').attr('class', 'r').attr('transform', (d, i) => `translate(0,${i * (bh + gap)})`);
      g.append('rect').attr('y', -gap / 2).attr('width', W).attr('height', bh + gap).attr('fill', 'transparent');
      g.append('text').attr('x', left - 10).attr('y', bh / 2).attr('dy', '0.35em').attr('text-anchor', 'end').text((d) => d[o.label])
        .each(function () { const t = d3.select(this); let s = t.text(); while (s.length > 3 && this.getComputedTextLength() > lw) { s = s.slice(0, -2); t.text(s + '…'); } });
      g.append('rect').attr('x', left).attr('y', 2).attr('height', bh - 4).attr('rx', 4).attr('width', (d) => Math.max(2, x(Number(d[o.value])))).style('fill', DES.verde);
      g.append('text').attr('class', 'des-val').attr('x', (d) => left + Math.max(2, x(Number(d[o.value]))) + 6).attr('y', bh / 2).attr('dy', '0.35em').text(o.fmt);
      g.on('pointermove', (ev, d) => tip.show(ev, o.tip(d))).on('pointerleave', () => tip.hide());
    }
  };
})();
