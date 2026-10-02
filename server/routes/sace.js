/**
 * SGA — Verificador de cotas de referência contra os boletins SACE/SGB
 * (server/routes/sace.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * As URLs /sace/{bacia}/ultimo_boletim.php do SGB servem SEMPRE o PDF do
 * boletim mais recente (verificado em 16/07/2026). Esta rota baixa os três
 * (Caí, Taquari, Uruguai) e CONFERE cada limiar gravado em cotas_referencia
 * contra o que o boletim publica PARA AQUELA ESTAÇÃO.
 *
 * DECISÃO DE PROJETO (segurança do dado): a rota NUNCA altera valores
 * sozinha — parsing de PDF é falível e limiar oficial não admite erro.
 * A atualização é sempre feita por humano lendo o boletim.
 *
 * COMO A CONFERÊNCIA É FEITA (revisão de 01/10/2026):
 *   O texto do PDF é lido com a POSIÇÃO de cada célula, então o valor é
 *   buscado na linha da própria estação e na coluna "Inundação" da tabela, e
 *   na legenda do gráfico da própria estação (atenção/alerta/inundação).
 *   A versão anterior procurava o número numa janela de texto em torno do
 *   nome e podia "confirmar" um limiar com o valor da estação vizinha
 *   (caso real: Linha Colombo 650 cm confirmado pelo 650 de Passo Carreiro,
 *   enquanto o boletim trazia 1240 cm).
 *
 * CADA ESTAÇÃO CAI EM UMA DE QUATRO SITUAÇÕES:
 *   confirmada       → o boletim publica o mesmo valor gravado;
 *   possivel_mudanca → o boletim publica valor DIFERENTE do gravado;
 *   nao_verificavel  → a estação está no boletim, mas sem o limiar
 *                      ("#" = sem valor definido, ou sem gráfico). Não é
 *                      divergência: não há valor publicado para comparar;
 *   nao_localizada   → a estação ou a célula não foi encontrada no PDF
 *                      (estação removida/renomeada ou mudança de layout).
 *
 * O workflow mensal FALHA (e o GitHub avisa por e-mail) em possivel_mudanca,
 * nao_localizada ou erro de download; nao_verificavel vira apenas AVISO.
 *
 * Dependência: pdf-parse 1.x  →  npm install pdf-parse
 * Proteção: ?chave=ANA_SYNC_TOKEN (mesmo secret do enriquecimento)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

let pdfParse = null;
try {
  const _pp = require('pdf-parse');
  pdfParse = (typeof _pp === 'function') ? _pp
           : (typeof _pp.default === 'function') ? _pp.default
           : (typeof _pp.pdf === 'function') ? _pp.pdf : null;
} catch (_) { /* tratado na rota */ }

const BACIAS = {
  'Caí':     'https://www.sgb.gov.br/sace/cai/ultimo_boletim.php',
  'Taquari': 'https://www.sgb.gov.br/sace/taquari/ultimo_boletim.php',
  'Uruguai': 'https://www.sgb.gov.br/sace/uruguai/ultimo_boletim.php',
};

/* tolerâncias de posição, em pontos do PDF (calibradas em 01/10/2026 nos 3
   boletins: linhas a ~10 pt uma da outra, colunas a ~35 pt uma da outra) */
const TOL_Y = 4;    // células da mesma linha da tabela
const TOL_X = 15;   // célula sob o cabeçalho da coluna

/* normaliza para comparação: maiúsculas e sem acentos */
const norm = (t) => String(t || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/* chave de nome: só letras e dígitos — assim "Costa do Rio Cadeia-Montante"
   (boletim) casa com "COSTA DO RIO CADEIA - MONTANTE" (cadastro) */
const chave = (t) => norm(t).replace(/[^A-Z0-9]/g, '');

/* formas do nome a tentar: a completa e a base sem sufixo local
   (ex.: "BOM RETIRO DO SUL - MONTANTE" aparece como "Bom Retiro do Sul") */
function chavesDoNome(nome) {
  const completa = chave(nome);
  const base = chave(String(nome || '').split(' - ')[0]);
  return (base && base !== completa) ? [completa, base] : [completa];
}

const centro = (i) => i.x + i.w / 2;

/* lê o PDF devolvendo cada trecho de texto com página e posição */
async function lerItens(buf) {
  const itens = [];
  let pagina = 0;
  await pdfParse(buf, {
    pagerender: (pageData) => pageData
      .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
      .then((tc) => {
        const p = pagina++;
        for (const it of tc.items) {
          const s = String(it.str || '').trim();
          if (!s) continue;
          itens.push({ p, x: it.transform[4], y: it.transform[5],
                       w: it.width || 0, s, n: norm(s) });
        }
        return '';
      }),
  });
  return itens;
}

/* data/hora de referência declarada no boletim (só para auditoria) */
function dataReferencia(itens) {
  const reData = /(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)/;
  for (const i of itens) {
    if (!i.n.includes('REFERENCIA') || !i.n.includes('DATA')) continue;
    const m = i.s.match(reData);
    if (m) return m[1];
    const viz = itens
      .filter(o => o.p === i.p && o !== i && o.x > i.x
                && Math.abs(o.y - i.y) <= TOL_Y && reData.test(o.s))
      .sort((a, b) => a.x - b.x);
    if (viz.length) return viz[0].s.match(reData)[1];
  }
  return null;
}

/* linha da estação na tabela: a célula com o nome exato, que seja a primeira
   célula de texto da linha (descarta a coluna "Município", que repete nomes)
   e que tenha outras células à direita */
function acharLinha(itens, nome) {
  for (const alvo of chavesDoNome(nome)) {
    const achadas = [];
    for (const it of itens) {
      if (chave(it.s) !== alvo) continue;
      const linha = itens.filter(o => o.p === it.p && Math.abs(o.y - it.y) <= TOL_Y);
      if (linha.some(o => o !== it && o.x < it.x && /[A-Z0-9]/.test(o.n))) continue;
      if (linha.filter(o => o.x > it.x).length < 2) continue;
      achadas.push({ cel: it, linha });
    }
    if (achadas.length === 1) return achadas[0];
    if (achadas.length > 1) return { ambigua: true };
  }
  return null;
}

/* centro (x) da coluna "Inundação": o cabeçalho mais próximo acima da linha,
   à direita do nome (descarta a legenda de cores, que fica à esquerda) */
function colunaInundacao(itens, cel) {
  const cands = itens.filter(i => i.p === cel.p && i.y > cel.y
    && i.n.includes('INUNDACAO') && i.s.length <= 40 && !/[=:;]/.test(i.s)
    && centro(i) > cel.x + cel.w);
  if (!cands.length) return null;
  cands.sort((a, b) => a.y - b.y);
  return centro(cands[0]);
}

/* limiares das legendas dos gráficos, por estação:
   { CHAVE: { atencao: [..], alerta: [..], inundacao: [..] } }
   Cada legenda pertence ao cabeçalho "CÓDIGO - NOME" mais próximo acima dela,
   na mesma página. */
function lerGraficos(itens) {
  const cabs = [], legs = [];
  for (const i of itens) {
    const c = i.n.match(/^\d{7,9}\s*-\s*([^:]+)/);
    if (c) cabs.push({ p: i.p, x: i.x, y: i.y, k: chave(c[1]) });
    if (/^(COTA DE\s+)?(INUNDACAO|ALERTA|ATENCAO)\s*\(/.test(i.n)) {
      const re = /(INUNDACAO|ALERTA|ATENCAO)\s*\(\s*(\d+)\s*CM\s*\)/g;
      let g;
      while ((g = re.exec(i.n)))
        legs.push({ p: i.p, x: i.x, y: i.y, tipo: g[1].toLowerCase(), v: +g[2] });
    }
  }
  const graficos = {};
  for (const c of cabs)
    if (!graficos[c.k]) graficos[c.k] = { atencao: [], alerta: [], inundacao: [] };
  for (const l of legs) {
    const acima = cabs.filter(c => c.p === l.p && c.y > l.y);
    if (!acima.length) continue;
    const dMin = Math.min(...acima.map(c => c.y - l.y));
    const mesmaFaixa = acima.filter(c => (c.y - l.y) - dMin <= 2)
      .sort((a, b) => a.x - b.x);
    // gráficos lado a lado: fica com o cabeçalho da coluna da legenda
    const dono = mesmaFaixa.filter(c => c.x <= l.x + 5).pop() || mesmaFaixa[0];
    if (!graficos[dono.k][l.tipo].includes(l.v)) graficos[dono.k][l.tipo].push(l.v);
  }
  return graficos;
}

const ROTULO = { atencao: 'atenção', alerta: 'alerta', inundacao: 'inundação' };

/* confere uma estação; devolve a situação e o detalhe de cada limiar */
function conferirEstacao(est, itens, graficos) {
  const campos = [['atencao', est.cota_atencao_cm],
                  ['alerta', est.cota_alerta_cm],
                  ['inundacao', est.cota_inundacao_cm]]
                 .filter(([, v]) => v != null)
                 .map(([c, v]) => [c, Math.round(+v)]);

  const loc = acharLinha(itens, est.nome);
  const naTabela = !!(loc && !loc.ambigua);
  let grafico = null;
  for (const k of chavesDoNome(est.nome)) if (!grafico && graficos[k]) grafico = graficos[k];

  // célula da coluna "Inundação" na linha da estação
  let celula = null;
  if (naTabela) {
    const xc = colunaInundacao(itens, loc.cel);
    if (xc != null) {
      const c = loc.linha.filter(i => i !== loc.cel && Math.abs(centro(i) - xc) <= TOL_X);
      if (c.length === 1) celula = c[0].s;
    }
  }

  const res = { possivel_mudanca: [], nao_localizada: [], nao_verificavel: [] };
  const add = (lista, campo, v, texto) =>
    res[lista].push({ campo: campo + '=' + v + 'cm', texto });

  for (const [campo, v] of campos) {
    const r = ROTULO[campo];
    if (!naTabela) {
      add('nao_localizada', campo, v, r + ' ' + v + ' cm: ' + (loc && loc.ambigua
        ? 'mais de uma linha com este nome na tabela do boletim'
        : 'estação não encontrada na tabela do boletim'));
      continue;
    }
    const publicados = [];
    if (campo === 'inundacao' && /^\d+$/.test(celula || '')) publicados.push(+celula);
    if (grafico) for (const g of grafico[campo]) if (!publicados.includes(g)) publicados.push(g);

    if (publicados.length) {
      if (!publicados.every(p => p === v))
        add('possivel_mudanca', campo, v,
            r + ': gravado ' + v + ' cm, boletim ' + publicados.join(' / ') + ' cm');
    } else if (campo === 'inundacao' && (celula === '#' || celula === '-')) {
      add('nao_verificavel', campo, v, r + ' ' + v + ' cm: boletim traz "' + celula
        + '" (' + (celula === '#' ? 'sem valor definido' : 'sem dado') + ') para a estação');
    } else if (campo === 'inundacao') {
      add('nao_localizada', campo, v,
          r + ' ' + v + ' cm: célula da coluna Inundação não identificada');
    } else if (grafico) {
      add('nao_localizada', campo, v,
          r + ' ' + v + ' cm: gráfico da estação sem legenda deste limiar');
    } else {
      add('nao_verificavel', campo, v,
          r + ' ' + v + ' cm: boletim não traz gráfico com este limiar para a estação');
    }
  }

  const situacao = res.possivel_mudanca.length ? 'possivel_mudanca'
                 : res.nao_localizada.length   ? 'nao_localizada'
                 : res.nao_verificavel.length  ? 'nao_verificavel' : 'confirmada';
  if (situacao === 'confirmada') return { situacao };
  const todos = [...res.possivel_mudanca, ...res.nao_localizada, ...res.nao_verificavel];
  return {
    situacao,
    entrada: {
      codigo: est.codigo_estacao, estacao: est.nome,
      campos: res[situacao].map(x => x.campo),
      detalhes: todos.map(x => x.texto),
      fonte_gravada: est.fonte || null,
    },
  };
}

/* GET/POST /api/sace/verificar-cotas?chave=... */
router.all('/verificar-cotas', async (req, res) => {
  try {
    if (process.env.ANA_SYNC_TOKEN && req.query.chave !== process.env.ANA_SYNC_TOKEN)
      return res.status(403).json({ erro: 'chave inválida' });
    if (!pdfParse)
      return res.status(500).json({ erro: 'dependência ausente: rode "npm install pdf-parse" e faça deploy' });

    const { rows: estacoes } = await db.query(`
      SELECT cr.codigo_estacao, cr.cota_atencao_cm, cr.cota_alerta_cm,
             cr.cota_inundacao_cm, cr.fonte, e.nome
        FROM cotas_referencia cr
        JOIN estacoes_ana e ON e.codigo = cr.codigo_estacao`);

    const resultado = [];
    for (const [bacia, url] of Object.entries(BACIAS)) {
      const doBacia = estacoes.filter(r => (r.fonte || '').includes(bacia));
      const item = { bacia, url, referencia: null, estacoes: doBacia.length,
                     confirmadas: 0, possivel_mudanca: [], nao_verificavel: [],
                     nao_localizada: [], erro: null };
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(45000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.slice(0, 4).toString() !== '%PDF') throw new Error('resposta não é PDF');
        item.boletim_kb = Math.round(buf.length / 1024);

        const itens = await lerItens(buf);
        if (!itens.length) throw new Error('PDF sem texto legível');
        item.referencia = dataReferencia(itens);
        const graficos = lerGraficos(itens);

        for (const est of doBacia) {
          const c = conferirEstacao(est, itens, graficos);
          if (c.situacao === 'confirmada') item.confirmadas++;
          else item[c.situacao].push(c.entrada);
        }
      } catch (e) { item.erro = e.message; }
      resultado.push(item);
    }

    const total = (campo) => resultado.reduce((s, b) => s + b[campo].length, 0);
    res.json({
      ok: true, consultado_em: new Date().toISOString(),
      total_possivel_mudanca: total('possivel_mudanca'),
      total_nao_verificavel: total('nao_verificavel'),
      total_nao_localizada: total('nao_localizada'),
      bacias: resultado,
      politica: 'Valores NÃO são alterados automaticamente. Em caso de possivel_mudanca ou nao_localizada, conferir o boletim oficial e atualizar cotas_referencia manualmente. nao_verificavel = boletim lista a estação sem o limiar (não há valor publicado para comparar).',
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
