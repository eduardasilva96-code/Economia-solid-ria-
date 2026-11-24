// ================= CÁLCULOS =================
dash.calc('base', {
  inputs: ['acoes'],
  title: 'Encontros válidos (com filtros)',
  description: 'Respostas com status Válido, filtradas por território, ciclo e agente.',
  fn: (acoes) => {
    const p = dash.params();
    return acoes.filter((r) => r.status === 'Válido'
      && (!p.territorio || r.territorio === p.territorio)
      && (!p.ciclo || r.ciclo === p.ciclo)
      && (!p.agente || r.pesquisador === p.agente));
  }
});

dash.calc('kpis', {
  inputs: ['base'],
  title: 'Totais do filtro atual',
  description: 'Encontros, territórios e instituições parceiras citadas.',
  fn: (base) => [{
    acoes: base.length,
    territorios: new Set(base.map((r) => r.territorio)).size,
    instituicoes: new Set(base.filter((r) => r.parceria === 'Sim' && r.instituicao).map((r) => r.instituicao)).size
  }]
});

dash.calc('proximo', {
  inputs: ['base'],
  title: 'Próximo encontro',
  description: 'O primeiro encontro com data de hoje em diante.',
  fn: (base) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const r = base.filter((x) => x.data_atividade >= hoje).sort((a, b) => a.data_atividade.localeCompare(b.data_atividade))[0];
    return r ? [{ data: r.data_atividade, territorio: r.territorio }] : [];
  }
});

dash.calc('lista', {
  inputs: ['base'],
  title: 'Lista de encontros',
  description: 'Encontros válidos com data e horário formatados, do mais novo para o mais antigo.',
  fn: (base) => {
    const hh = (h) => { if (h === null || h === '' || isNaN(Number(h))) return ''; const v = Number(h); const H = Math.floor(v); const M = Math.round((v - H) * 60); return String(H).padStart(2, '0') + ':' + String(M).padStart(2, '0'); };
    return base.slice().sort((a, b) => b.data_atividade.localeCompare(a.data_atividade) || Number(a.hora_inicio) - Number(b.hora_inicio))
      .map((r) => {
        const [y, m, d] = r.data_atividade.split('-');
        const fim = (r.hora_inicio !== null && r.duracao_h !== null && r.hora_inicio !== '' && r.duracao_h !== '') ? Number(r.hora_inicio) + Number(r.duracao_h) : null;
        return {
          registro: r.registro, data_iso: r.data_atividade, data: d + '/' + m + '/' + y, dia_semana: r.dia_semana,
          inicio: hh(r.hora_inicio), termino: fim === null ? '' : hh(fim), territorio: r.territorio,
          agente: r.pesquisador || '', contato: r.contato || '', local: r.local || '',
          endereco: [r.endereco, r.cep ? 'CEP ' + r.cep : ''].filter(Boolean).join(' · '),
          parceria: r.parceria === 'Campo não existia' ? '—' : r.parceria
        };
      });
  }
});

dash.calc('por_mes', {
  inputs: ['base'],
  title: 'Encontros por mês',
  description: 'Encontros válidos por mês, incluindo meses sem encontros.',
  fn: (base) => {
    if (!base.length) return [];
    const c = {};
    base.forEach((r) => { c[r.mes] = (c[r.mes] || 0) + 1; });
    const ms = Object.keys(c).sort();
    let [y, m] = ms[0].split('-').map(Number);
    const [ey, em] = ms[ms.length - 1].split('-').map(Number);
    const out = [];
    while (y < ey || (y === ey && m <= em)) {
      const k = y + '-' + String(m).padStart(2, '0');
      out.push({ mes: k, n: c[k] || 0 });
      m += 1; if (m > 12) { m = 1; y += 1; }
    }
    return out;
  }
});

dash.calc('mapa', {
  inputs: ['base', 'territorios'],
  title: 'Encontros por território, com posição',
  description: 'Encontros válidos por território, com a posição aproximada de cada região administrativa.',
  fn: (base, territorios) => {
    const k = (s) => String(s || '').normalize('NFC').trim();
    const c = {};
    base.forEach((r) => { c[k(r.territorio)] = (c[k(r.territorio)] || 0) + 1; });
    return territorios.filter((t) => c[k(t.territorio)]).map((t) => ({
      territorio: t.territorio, n: c[k(t.territorio)], lat: Number(t.lat), lon: Number(t.lon), rotulo: t.rotulo || 'abaixo'
    })).sort((a, b) => b.n - a.n);
  }
});

dash.calc('turno_terr', {
  inputs: ['base'],
  title: 'Turno por território',
  description: 'Encontros válidos por território e turno de início.',
  fn: (base) => {
    const turnos = ['Manhã', 'Tarde', 'Noite'];
    const ters = [...new Set(base.map((r) => r.territorio))];
    const out = [];
    ters.forEach((territorio) => turnos.forEach((turno) => {
      out.push({ territorio, turno, n: base.filter((r) => r.territorio === territorio && r.turno === turno).length });
    }));
    return out;
  }
});

dash.calc('instituicoes', {
  inputs: ['base'],
  title: 'Instituições parceiras citadas',
  description: 'Encontros com parceria, por instituição ou coletivo.',
  fn: (base) => {
    const c = {};
    base.filter((r) => r.parceria === 'Sim' && r.instituicao).forEach((r) => { c[r.instituicao] = (c[r.instituicao] || 0) + 1; });
    return Object.entries(c).map(([instituicao, n]) => ({ instituicao, n }))
      .sort((a, b) => b.n - a.n || a.instituicao.localeCompare(b.instituicao, 'pt-BR'));
  }
});

dash.calc('funil', {
  inputs: ['indicadores'],
  title: 'Da inscrição à multiplicação',
  description: 'Etapas da formação e a passagem de uma para a outra.',
  fn: (indicadores) => {
    const i = indicadores[0] || {};
    const ins = Number(i.inscritas), q = Number(i.qualificadas), a = Number(i.agentes_populares), m = Number(i.multiplicados);
    return [{
      inscritas: ins, qualificadas: q, agentes: a, multiplicados: m,
      pct_qualificadas: ins ? Math.round(q / ins * 100) : null,
      pct_agentes: q ? Math.round(a / q * 100) : null,
      por_agente: a ? Math.round(m / a) : null
    }];
  }
});

dash.calc('qualidade', {
  inputs: ['acoes'],
  title: 'Qualidade dos dados',
  description: 'Problemas encontrados em todas as respostas do formulário, sem filtros.',
  fn: (acoes) => {
    const v = acoes.filter((r) => r.status === 'Válido');
    return [{
      total: acoes.length,
      validos: v.length,
      testes: acoes.filter((r) => r.status === 'Teste').length,
      datas_invalidas: acoes.filter((r) => r.status === 'Data inválida').length,
      horario_livre: acoes.filter((r) => r.horario_texto_livre === 'Sim').length,
      retroativas: v.filter((r) => Number(r.antecedencia_dias) < 0).length,
      nomes_distintos: new Set(v.map((r) => r.pesquisador).filter(Boolean)).size,
      instituicoes: new Set(v.filter((r) => r.parceria === 'Sim' && r.instituicao).map((r) => r.instituicao)).size,
      ultima_resposta: acoes.map((r) => r.enviado_em).sort().pop() || null
    }];
  }
});
