/* Fichamentos STF — PGE/AL
   Estático, sem framework. Progresso e filas no localStorage do aparelho. */
'use strict';

const $ = s => document.querySelector(s);
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c;
  if (x != null) n.textContent = x; return n; };
const dobra = s => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hoje = () => new Date().toISOString();

/* ---------- armazenamento (sempre tolerante a falha) ---------- */
const LS = {
  ler(k, padrao) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; }
                   catch { return padrao; } },
  gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const K = { prog: 'pgeal.prog', filas: 'pgeal.filas', cfg: 'pgeal.cfg' };

const S = {
  meta: null, itens: [], resultado: [], fila: null, atual: null,
  prog: LS.ler(K.prog, {}), filas: LS.ler(K.filas, []), cfg: LS.ler(K.cfg, {}),
  filtro: { disc: new Set(), ano: new Set(), infMin: null, infMax: null,
            status: 'todos', tag: '', relator: '', rg: false, fich: true, q: '' },
  cacheFicha: new Map()
};

const salvarProg = () => { if (!LS.gravar(K.prog, S.prog)) avisar(
  'Não consegui salvar no navegador. Suas marcações desta sessão podem se perder — exporte um backup.'); };
const salvarFilas = () => LS.gravar(K.filas, S.filas);

function reg(id, acao) {
  const p = S.prog[id] || (S.prog[id] = { status: 'nao', tags: [], nota: '', historico: [] });
  p.historico.push({ ts: hoje(), acao });
  if (p.historico.length > 60) p.historico = p.historico.slice(-60);
  return p;
}
const estudado = id => (S.prog[id] || {}).status === 'estudado';
const tagsDe = id => (S.prog[id] || {}).tags || [];
const todasTags = () => [...new Set(Object.values(S.prog).flatMap(p => p.tags || []))].sort();

/* ---------- diálogo ---------- */
function dialogo(html) {
  $('#dlgCorpo').innerHTML = html;
  const d = $('#dlg'); d.showModal(); return d;
}
function avisar(msg) {
  dialogo(`<h3>Atenção</h3><p>${msg}</p>
    <div class="acoes"><button class="bt bt--forte" onclick="this.closest('dialog').close()">Entendi</button></div>`);
}

/* ---------- filtros ---------- */
function aplicar() {
  const f = S.filtro, q = dobra(f.q).split(/\s+/).filter(Boolean);
  S.resultado = S.itens.filter(x => {
    if (f.fich && !x.f) return false;
    if (f.disc.size && !x.d.some(d => f.disc.has(d))) return false;
    if (f.ano.size && !f.ano.has(x.a)) return false;
    if (f.infMin != null && (x.i || 0) < f.infMin) return false;
    if (f.infMax != null && (x.i || 0) > f.infMax) return false;
    if (f.rg && !x.rg) return false;
    if (f.relator && x.r !== f.relator) return false;
    if (f.status === 'visto' && !estudado(x.id)) return false;
    if (f.status === 'nao' && estudado(x.id)) return false;
    if (f.tag && !tagsDe(x.id).includes(f.tag)) return false;
    if (q.length && !q.every(t => x.b.includes(t))) return false;
    return true;
  });
  renderLista();
}

function renderLista() {
  const L = $('#lista'); L.textContent = '';
  const vistos = S.resultado.filter(x => estudado(x.id)).length;
  $('#contador').innerHTML = S.resultado.length
    ? `<b>${S.resultado.length}</b> ${S.resultado.length === 1 ? 'julgado' : 'julgados'} · ${vistos} estudados`
    : 'nenhum resultado';
  $('#btEstudar').disabled = !S.resultado.length;
  $('#btEstudar').textContent = S.resultado.length ? `Estudar estes ${S.resultado.length}` : 'Estudar';
  $('#btImprimir').disabled = !S.resultado.length;

  if (!S.resultado.length) {
    L.append(el('div', 'vazio', 'Nenhum julgado com esses filtros. Tente limpar algum.'));
    return;
  }
  const frag = document.createDocumentFragment();
  for (const x of S.resultado.slice(0, 400)) {
    const c = el('button', 'card'); c.dataset.visto = estudado(x.id) ? '1' : '0';
    const cab = el('div', 'cab');
    cab.append(el('span', 'proc', x.p + (x.n > 1 ? ` +${x.n - 1}` : '')),
               el('span', 'mini', `Inf ${x.i} · ${x.a}`));
    c.append(cab, el('div', 'tit', x.t || '(sem título)'));
    const pe = el('div', 'pe');
    for (const d of x.d) pe.append(el('span', 'selo', d));
    if (x.rg) pe.append(el('span', 'selo', 'RG'));
    if (!x.e) pe.append(el('span', 'selo selo--sem', 'sem ementa'));
    if (!x.f) pe.append(el('span', 'selo selo--sem', 'sem fichamento'));
    if (estudado(x.id)) pe.append(el('span', 'selo selo--visto', 'estudado'));
    for (const t of tagsDe(x.id)) pe.append(el('span', 'selo selo--tag', t));
    c.append(pe);
    c.onclick = () => { filaImplicita(x.id); abrir(x.id); };
    frag.append(c);
  }
  if (S.resultado.length > 400)
    frag.append(el('div', 'vazio', `Mostrando os primeiros 400 de ${S.resultado.length}. Refine os filtros.`));
  L.append(frag);
}

/* ---------- ficha ---------- */
async function carregar(id) {
  if (S.cacheFicha.has(id)) return S.cacheFicha.get(id);
  const r = await fetch(`dados/f/${id}.json`);
  if (!r.ok) throw new Error('não consegui carregar ' + id);
  const j = await r.json(); S.cacheFicha.set(id, j); return j;
}

async function abrir(id) {
  let j;
  try { j = await carregar(id); }
  catch { avisar('Não consegui abrir esta ficha. Verifique se a pasta <code>dados</code> está junto do site.'); return; }
  S.atual = j;
  mostrar('#vFicha');
  $('#rodapeEstudo').hidden = false;
  desenharFicha(j);
  atualizarRodapeFila();
  window.scrollTo(0, 0);
  location.hash = '#/j/' + id;
}

function desenharFicha(j) {
  const C = $('#conteudoFicha'); C.textContent = '';
  C.append(el('p', 'eyebrow',
    `Informativo ${j.informativo} · ${j.disciplinas.join(' · ')} · ${(j.data || '').split('-').reverse().join('/')}`));
  C.append(el('h1', null, j.processo));

  if (j.processos.length > 1) {
    const fx = el('div', 'faixa-grupo');
    fx.append(el('span', 'rotulo', `Julgamento conjunto · ${j.processos.length} processos`));
    const p = el('p'); p.innerHTML =
      `Ementa, tese e Informativo reproduzidos a partir do processo líder <strong>${j.processos[0]}</strong>. ` +
      `Cobre também: ${j.processos.slice(1).join(', ')}.`;
    fx.append(p); C.append(fx);
  }

  const abas = el('div', 'abas nao-imprime');
  const alvo = el('div');
  const painéis = {
    fichamento: j.fichamento,
    informativo: j.informativoHtml,
    ementa: j.ementaHtml
  };
  const rotulos = { fichamento: 'Fichamento', informativo: 'Informativo', ementa: 'Ementa' };
  const disp = Object.keys(painéis).filter(k => painéis[k]);
  const inicial = disp.includes('fichamento') ? 'fichamento' : disp[0];
  for (const k of disp) {
    const b = el('button', null, rotulos[k]);
    b.setAttribute('aria-selected', k === inicial);
    b.onclick = () => {
      [...abas.children].forEach(o => o.setAttribute('aria-selected', o === b));
      alvo.innerHTML = painéis[k];
    };
    abas.append(b);
  }
  if (disp.length > 1) C.append(abas);
  alvo.innerHTML = painéis[inicial] || '';
  if (!j.fichamento) {
    const a = el('div', 'aviso', 'Este julgado ainda não tem fichamento gerado. Abaixo está o texto do Informativo.');
    C.append(a);
  }
  C.append(alvo);
  C.append(anotacao(j));
  C.append(rodapeFicha(j));
}

function anotacao(j) {
  const box = el('div', 'anotar nao-imprime');
  box.append(el('h4', null, 'Sua marcação'));
  const tb = el('div', 'tagbox');
  const redesenhar = () => {
    tb.textContent = '';
    for (const t of tagsDe(j.id)) {
      const s = el('span', 'tag', t);
      const x = el('button', null, '×'); x.title = 'remover'; x.setAttribute('aria-label', 'remover tag ' + t);
      x.onclick = () => {
        const p = reg(j.id, 'tag_remove'); p.tags = p.tags.filter(v => v !== t);
        salvarProg(); redesenhar(); preencherTags();
      };
      s.append(x); tb.append(s);
    }
    const inp = el('input'); inp.type = 'text'; inp.placeholder = 'nova tag'; inp.size = 12;
    inp.setAttribute('list', 'listaTags');
    inp.onkeydown = e => {
      if (e.key !== 'Enter') return;
      const v = inp.value.trim(); if (!v) return;
      const p = reg(j.id, 'tag_add'); if (!p.tags.includes(v)) p.tags.push(v);
      salvarProg(); redesenhar(); preencherTags();
    };
    tb.append(inp);
  };
  redesenhar();
  box.append(tb);

  const ta = el('textarea'); ta.placeholder = 'Anotação pessoal…';
  ta.value = (S.prog[j.id] || {}).nota || '';
  let tmr; ta.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => {
    const p = S.prog[j.id] || reg(j.id, 'nota'); p.nota = ta.value; salvarProg(); }, 500); };
  box.append(ta);

  const h = (S.prog[j.id] || {}).historico || [];
  if (h.length) {
    const ult = h.filter(e => e.acao === 'estudado' || e.acao === 'revisado');
    if (ult.length) box.append(el('div', 'hist',
      `${ult.length}× estudado · último em ${new Date(ult[ult.length - 1].ts).toLocaleDateString('pt-BR')}`));
  }
  return box;
}

function rodapeFicha(j) {
  const R = el('div', 'rodape-ficha');
  if (j.dentro.length) {
    R.append(el('h4', null, 'Precedentes citados que estão na sua base'));
    const p = el('div', 'pilha');
    for (const d of j.dentro) {
      const b = el('button', 'ref ref--liga', d.p);
      b.onclick = () => { filaImplicita(d.id); abrir(d.id); };
      p.append(b);
    }
    R.append(p);
  }
  if (j.fora.length) {
    R.append(el('h4', null, 'Precedentes citados fora da base'));
    R.append(el('p', null, 'Anteriores a agosto de 2021, fora da coleta dos Informativos. ' +
      'O fichamento não afirma nada sobre o conteúdo deles — o material do STF só os menciona.'));
    const p = el('div', 'pilha');
    for (const f of j.fora) p.append(el('span', 'ref ref--fora', f));
    R.append(p);
  }
  R.append(el('h4', null, 'Conferir no STF'));
  const p = el('div', 'pilha');
  for (const [rot, url] of Object.entries(j.links)) {
    const a = el('a', 'ref ref--url', rot); a.href = url; a.target = '_blank'; a.rel = 'noopener';
    p.append(a);
  }
  R.append(p);
  return R;
}

/* ---------- fila de estudo ---------- */
/* Abrir um julgado pela lista já cria uma fila com o resultado da busca, para que
   Próximo e Anterior funcionem sem a candidata precisar clicar em "Estudar". Se o
   julgado não estiver no resultado (veio de um link de precedente), a fila vira só ele. */
function filaImplicita(id) {
  const ids = S.resultado.map(x => x.id);
  const pos = ids.indexOf(id);
  S.fila = pos >= 0
    ? { nome: null, ids, pos, filtro: serializarFiltro(), criada: hoje() }
    : { nome: null, ids: [id], pos: 0, filtro: null, criada: hoje() };
}
function iniciarFila(nome) {
  S.fila = { nome: nome || 'Fila sem nome', ids: S.resultado.map(x => x.id), pos: 0,
             filtro: serializarFiltro(), criada: hoje() };
  if (!S.fila.ids.length) return;
  abrir(S.fila.ids[0]);
}
function atualizarRodapeFila() {
  const f = S.fila;
  const varios = !!f && f.ids.length > 1;
  $('#posFila').textContent = varios ? `${f.pos + 1} de ${f.ids.length}` : '';
  $('#progFila').hidden = !varios;
  if (varios) $('#progFila').firstElementChild.style.width =
    ((f.ids.filter(id => estudado(id)).length / f.ids.length) * 100) + '%';
  $('#btAnterior').hidden = !varios;
  $('#btSeguinte').hidden = !varios;
  $('#btAnterior').disabled = varios && f.pos === 0;
  $('#btSeguinte').disabled = varios && f.pos === f.ids.length - 1;
  $('#btProximo').textContent = varios ? 'Estudado ✓' : 'Marcar como estudado';
}
function irPara(delta) {
  const f = S.fila; if (!f) return;
  const p = f.pos + delta;
  if (p < 0 || p >= f.ids.length) return;
  f.pos = p; salvarFilas(); abrir(f.ids[p]);
}
function marcarEAvancar() {
  if (!S.atual) return;
  const id = S.atual.id;
  const p = S.prog[id];
  reg(id, p && p.status === 'estudado' ? 'revisado' : 'estudado').status = 'estudado';
  salvarProg();
  if (S.fila && S.fila.pos < S.fila.ids.length - 1) irPara(1);
  else { atualizarRodapeFila(); desenharFicha(S.atual);
         if (S.fila) avisar('Fim da fila. Todos os julgados desta busca foram percorridos.'); }
}

/* ---------- impressão ---------- */
async function imprimir(ids) {
  const LIM = 60;
  const usar = ids.slice(0, LIM);
  if (ids.length > LIM) {
    const ok = await new Promise(res => {
      const d = dialogo(`<h3>Imprimir ${ids.length} julgados?</h3>
        <p>Um PDF com tudo isso fica pesado e demora a montar. Vou incluir os primeiros ${LIM}.
        Se quiser o resto, refine os filtros e imprima em partes.</p>
        <div class="acoes">
          <button class="bt bt--forte" id="okImp">Imprimir os ${LIM} primeiros</button>
          <button class="bt" id="cancImp">Cancelar</button></div>`);
      $('#okImp').onclick = () => { d.close(); res(true); };
      $('#cancImp').onclick = () => { d.close(); res(false); };
    });
    if (!ok) return;
  }
  const A = $('#areaImpressao'); A.textContent = 'Montando…';
  A.hidden = false; $('#vBiblioteca').hidden = true; $('#vFicha').hidden = true;
  const partes = [];
  for (const id of usar) {
    try {
      const j = await carregar(id);
      partes.push(`<article class="folha quebra"><div class="leitura">
        <p class="eyebrow">Informativo ${j.informativo} · ${j.disciplinas.join(' · ')}</p>
        <h1>${j.processos.join(', ')}</h1>
        ${j.fichamento || j.informativoHtml}</div></article>`);
    } catch { /* pula o que não carregar */ }
  }
  A.innerHTML = partes.join('');
  window.print();
  A.hidden = true; A.textContent = '';
  if (S.atual && location.hash.startsWith('#/j/')) $('#vFicha').hidden = false;
  else $('#vBiblioteca').hidden = false;
}

/* ---------- seleção do que exportar ---------- */
function dialogoExportar() {
  if (!S.resultado.length) return;
  const linhas = S.resultado.map(x =>
    `<label><input type="checkbox" checked value="${x.id}">
       <span class="p">${x.p}${x.n > 1 ? ` +${x.n - 1}` : ''}</span>
       <span class="t">${(x.t || '(sem título)').replace(/[<>]/g, '')}</span>
       <span class="i">Inf ${x.i}</span></label>`).join('');
  const d = dialogo(`<h3>Exportar em PDF</h3>
    <p>Estes são os ${S.resultado.length} julgados da sua busca. Desmarque o que não quiser levar.</p>
    <div class="linha" style="margin-bottom:4px">
      <button class="bt" id="selTodos">Marcar todos</button>
      <button class="bt" id="selNenhum">Desmarcar todos</button>
      <span class="contaSel" id="contaSel"></span>
    </div>
    <div class="selLista" id="selLista">${linhas}</div>
    <div class="acoes">
      <button class="bt bt--forte" id="okExp">Exportar</button>
      <button class="bt" onclick="this.closest('dialog').close()">Cancelar</button></div>`);
  d.firstElementChild.classList.add('dlg--largo');
  const caixas = () => [...d.querySelectorAll('#selLista input')];
  const marcadas = () => caixas().filter(c => c.checked);
  const atualiza = () => {
    const n = marcadas().length;
    $('#contaSel').textContent = `${n} selecionado${n === 1 ? '' : 's'}`;
    $('#okExp').disabled = !n;
    $('#okExp').textContent = n ? `Exportar ${n}` : 'Exportar';
  };
  d.querySelector('#selLista').onchange = atualiza;
  $('#selTodos').onclick = () => { caixas().forEach(c => c.checked = true); atualiza(); };
  $('#selNenhum').onclick = () => { caixas().forEach(c => c.checked = false); atualiza(); };
  $('#okExp').onclick = () => { const ids = marcadas().map(c => c.value); d.close(); imprimir(ids); };
  atualiza();
}

/* ---------- backup ---------- */
function serializarFiltro() {
  const f = S.filtro;
  return { disc: [...f.disc], ano: [...f.ano], infMin: f.infMin, infMax: f.infMax,
           status: f.status, tag: f.tag, relator: f.relator, rg: f.rg, fich: f.fich, q: f.q };
}
function exportarBackup() {
  const dados = { versao: 1, exportado_em: hoje(), progresso: S.prog, filas: S.filas, config: S.cfg };
  const blob = new Blob([JSON.stringify(dados, null, 1)], { type: 'application/json' });
  const a = el('a'); a.href = URL.createObjectURL(blob);
  a.download = `pgeal-backup-${hoje().slice(0, 10)}.json`;
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
}
function importarBackup(txt, modo) {
  let d; try { d = JSON.parse(txt); } catch { avisar('Arquivo inválido — não é um backup JSON.'); return; }
  if (!d.progresso) { avisar('Esse arquivo não tem progresso dentro.'); return; }
  if (modo === 'substituir') { S.prog = d.progresso; S.filas = d.filas || []; }
  else {
    for (const [id, novo] of Object.entries(d.progresso)) {
      const atual = S.prog[id];
      if (!atual) { S.prog[id] = novo; continue; }
      const vistos = new Set((atual.historico || []).map(e => e.ts + e.acao));
      atual.historico = [...(atual.historico || []),
        ...(novo.historico || []).filter(e => !vistos.has(e.ts + e.acao))]
        .sort((a, b) => a.ts.localeCompare(b.ts));
      atual.tags = [...new Set([...(atual.tags || []), ...(novo.tags || [])])];
      if (novo.status === 'estudado') atual.status = 'estudado';
      if (novo.nota && novo.nota !== atual.nota)
        atual.nota = atual.nota ? atual.nota + '\n---\n' + novo.nota : novo.nota;
    }
    const nomes = new Set(S.filas.map(f => f.nome));
    for (const f of (d.filas || [])) if (!nomes.has(f.nome)) S.filas.push(f);
  }
  salvarProg(); salvarFilas(); preencherTags(); aplicar();
  avisar(`Backup importado (${Object.keys(d.progresso).length} julgados). ` +
         (modo === 'substituir' ? 'O que havia antes foi substituído.' : 'As marcações foram somadas às suas.'));
}

/* ---------- montagem da interface ---------- */
function preencherTags() {
  const sel = $('#fTag'), atual = sel.value;
  sel.textContent = ''; sel.append(new Option('todas as tags', ''));
  for (const t of todasTags()) sel.append(new Option(t, t));
  sel.value = atual;
  let dl = $('#listaTags');
  if (!dl) { dl = el('datalist'); dl.id = 'listaTags'; document.body.append(dl); }
  dl.textContent = '';
  for (const t of todasTags()) dl.append(new Option(t));
}

function mostrar(sel) {
  for (const v of ['#vBiblioteca', '#vFicha']) $(v).hidden = (v !== sel);
}

function chips(cont, valores, onToggle) {
  cont.textContent = '';
  for (const v of valores) {
    const b = el('button', 'chip', String(v));
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => {
      const on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', String(!on));
      onToggle(v, !on); aplicar();
    };
    cont.append(b);
  }
}

function ligarEventos() {
  $('#btInicio').onclick = () => { S.fila = null; location.hash = '#/'; mostrar('#vBiblioteca'); aplicar(); };
  $('#btVoltar').onclick = () => { location.hash = '#/'; mostrar('#vBiblioteca'); aplicar(); };
  $('#btProximo').onclick = marcarEAvancar;
  $('#btAnterior').onclick = () => irPara(-1);
  $('#btImprimir').onclick = dialogoExportar;
  $('#btPdfFicha').onclick = () => { if (S.atual) imprimir([S.atual.id]); };
  $('#btSeguinte').onclick = () => irPara(1);
  $('#btInicioFicha').onclick = () => {
    S.fila = null; S.atual = null; location.hash = '#/'; mostrar('#vBiblioteca'); aplicar();
    window.scrollTo(0, 0);
  };
  $('#btLimpar').onclick = () => location.reload();

  $('#btEstudar').onclick = () => {
    const d = dialogo(`<h3>Começar a estudar</h3>
      <p>São ${S.resultado.length} julgados nesta busca. Dê um nome se quiser guardar a fila
      para retomar depois.</p>
      <input type="text" id="nomeFila" placeholder="ex.: Administrativo 2025" style="width:100%">
      <div class="acoes"><button class="bt bt--forte" id="okFila">Começar</button>
      <button class="bt" onclick="this.closest('dialog').close()">Cancelar</button></div>`);
    $('#nomeFila').focus();
    $('#okFila').onclick = () => {
      const n = $('#nomeFila').value.trim();
      d.close(); iniciarFila(n);
      if (n) { S.filas = S.filas.filter(f => f.nome !== n); S.filas.push(S.fila); salvarFilas(); }
    };
  };

  $('#btFilas').onclick = () => {
    if (!S.filas.length) { avisar('Você ainda não salvou nenhuma fila. Filtre a lista e clique em Estudar.'); return; }
    const linhas = S.filas.map((f, i) => {
      const v = f.ids.filter(id => estudado(id)).length;
      return `<p style="margin-bottom:8px"><button class="bt" data-i="${i}">${f.nome}</button>
        <span class="conta"> ${v}/${f.ids.length} · parou no ${f.pos + 1}º</span></p>`;
    }).join('');
    const d = dialogo(`<h3>Suas filas</h3>${linhas}
      <div class="acoes"><button class="bt" onclick="this.closest('dialog').close()">Fechar</button></div>`);
    d.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      S.fila = S.filas[+b.dataset.i]; d.close(); abrir(S.fila.ids[S.fila.pos]);
    });
  };

  $('#btBackup').onclick = () => {
    const n = Object.keys(S.prog).length;
    const d = dialogo(`<h3>Backup do seu estudo</h3>
      <p>São ${n} julgados marcados e ${S.filas.length} fila(s). O arquivo leva tudo:
      estudados, tags, anotações, histórico e filas. Nada disso sai do seu aparelho sozinho.</p>
      <div class="acoes">
        <button class="bt bt--forte" id="expB">Exportar</button>
        <button class="bt" id="impB">Importar…</button>
        <button class="bt" onclick="this.closest('dialog').close()">Fechar</button></div>
      <input type="file" id="arqB" accept="application/json" hidden>`);
    $('#expB').onclick = () => { exportarBackup(); d.close(); };
    $('#impB').onclick = () => $('#arqB').click();
    $('#arqB').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        d.close();
        const d2 = dialogo(`<h3>Como importar?</h3>
          <p><strong>Mesclar</strong> soma ao que você já tem — é o certo para trazer o estudo
          de outro aparelho. <strong>Substituir</strong> apaga o que está aqui.</p>
          <div class="acoes"><button class="bt bt--forte" id="mesc">Mesclar</button>
          <button class="bt" id="subs">Substituir tudo</button>
          <button class="bt" onclick="this.closest('dialog').close()">Cancelar</button></div>`);
        $('#mesc').onclick = () => { d2.close(); importarBackup(r.result, 'mesclar'); };
        $('#subs').onclick = () => { d2.close(); importarBackup(r.result, 'substituir'); };
      };
      r.readAsText(f);
    };
  };

  $('#btTema').onclick = () => {
    const atual = document.documentElement.getAttribute('data-theme');
    const novo = atual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', novo);
    S.cfg.tema = novo; LS.gravar(K.cfg, S.cfg);
  };

  const F = S.filtro;
  $('#fStatus').onchange = e => { F.status = e.target.value; aplicar(); };
  $('#fTag').onchange = e => { F.tag = e.target.value; aplicar(); };
  $('#fRelator').onchange = e => { F.relator = e.target.value; aplicar(); };
  $('#fInfMin').oninput = e => { F.infMin = e.target.value ? +e.target.value : null; aplicar(); };
  $('#fInfMax').oninput = e => { F.infMax = e.target.value ? +e.target.value : null; aplicar(); };
  for (const [sel, campo] of [['#fRG', 'rg'], ['#fFich', 'fich']])
    $(sel).onclick = () => { F[campo] = !F[campo]; $(sel).setAttribute('aria-pressed', String(F[campo])); aplicar(); };
  let tb; $('#fBusca').oninput = e => { clearTimeout(tb);
    tb = setTimeout(() => { F.q = e.target.value; aplicar(); }, 180); };

  document.addEventListener('keydown', e => {
    if ($('#vFicha').hidden || e.target.matches('input,textarea,select') || $('#dlg').open) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); irPara(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); irPara(-1); }
    if (e.key.toLowerCase() === 'e') { e.preventDefault(); marcarEAvancar(); }
  });

  let x0 = null;
  $('#vFicha').addEventListener('touchstart', e => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  $('#vFicha').addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 90) irPara(dx < 0 ? 1 : -1);
  }, { passive: true });

  addEventListener('hashchange', () => {
    const m = location.hash.match(/^#\/j\/(.+)$/);
    if (m && (!S.atual || S.atual.id !== m[1])) abrir(m[1]);
    if (!m) { mostrar('#vBiblioteca'); aplicar(); }
  });
}

/* ---------- início ---------- */
(async function () {
  if (S.cfg.tema) document.documentElement.setAttribute('data-theme', S.cfg.tema);
  let d;
  try { d = await (await fetch('dados/indice.json')).json(); }
  catch {
    document.body.innerHTML = '<div class="vazio" style="padding:60px">' +
      'Não consegui carregar <code>dados/indice.json</code>.<br><br>' +
      'Se você abriu o arquivo com duplo clique, o navegador bloqueia a leitura da pasta. ' +
      'Publique o site ou rode um servidor local.</div>';
    return;
  }
  S.meta = d.meta; S.itens = d.itens;
  $('#statusTopo').innerHTML =
    `<b>${S.meta.comFichamento}</b> de ${S.meta.total} fichados · Informativos ${S.meta.informativos[0]}–${S.meta.informativos[1]}`;
  chips($('#fDisciplinas'), S.meta.disciplinas, (v, on) => on ? S.filtro.disc.add(v) : S.filtro.disc.delete(v));
  chips($('#fAnos'), S.meta.anos, (v, on) => on ? S.filtro.ano.add(v) : S.filtro.ano.delete(v));
  for (const r of S.meta.relatores) $('#fRelator').append(new Option(r, r));
  preencherTags(); ligarEventos();
  const m = location.hash.match(/^#\/j\/(.+)$/);
  aplicar();
  if (m) abrir(m[1]);
})();
