/**
 * SGA — App Cidadão (server/routes/cidadao.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Relatos da população com protocolo, formulário por fenômeno (COBRADE
 * oficial) e até 3 fotos com coordenadas capturadas NO MOMENTO da foto.
 *
 * ROTAS PÚBLICAS (app):
 *   GET  /api/cidadao/tipos                 → formulários dinâmicos por fenômeno
 *   POST /api/cidadao/relato                → multipart (campos + fotos[]) → protocolo
 *   GET  /api/cidadao/relato/:protocolo?tel=... → cidadão acompanha o status
 *
 * ROTAS DA PREFEITURA (módulo SGA — exigem ?chave=ANA_SYNC_TOKEN):
 *   GET   /api/cidadao/relatos?chave=&status=&ibge=&limite=
 *   PATCH /api/cidadao/relato/:id/status?chave=   body {status, obs}
 *
 * REQUISITOS DE AMBIENTE (Render):
 *   SUPABASE_URL          ex.: https://rprlpowscrnkomzapivy.supabase.co
 *   SUPABASE_SERVICE_KEY  (service_role — Settings → API; NUNCA no front)
 * DEPENDÊNCIA: multer  →  npm install multer
 * LGPD: coleta mínima (nome/telefone), consentimento obrigatório, dados
 * pessoais nunca expostos sem chave; fotos em bucket público (exibição).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 3, fileSize: 4 * 1024 * 1024 },   // 3 fotos · 4 MB cada
  fileFilter: (req, f, cb) => cb(null, /^image\//.test(f.mimetype)),
});

/* ── Formulários por fenômeno (COBRADE verificado) ────────────────────────── */
const TIPOS = [
  { chave: 'inundacao', rotulo: 'Inundação (rio subiu)', icone: '🌊', cobrade: '1.2.1.0.0',
    campos: [
      { id: 'agua_residencia', rotulo: 'A água atingiu sua residência?', tipo: 'select',
        opcoes: ['Não', 'Sim — pátio/terreno', 'Sim — dentro de casa'], obrigatorio: true },
      { id: 'nivel_agua', rotulo: 'Altura aproximada da água', tipo: 'select',
        opcoes: ['Até o tornozelo', 'Até o joelho', 'Até a cintura', 'Acima da cintura'], obrigatorio: true },
      { id: 'pessoas_ilhadas', rotulo: 'Há pessoas ilhadas ou desabrigadas?', tipo: 'select',
        opcoes: ['Não', 'Sim'], obrigatorio: true },
      { id: 'qtd_pessoas', rotulo: 'Quantas pessoas no imóvel?', tipo: 'number', obrigatorio: false },
    ] },
  { chave: 'alagamento', rotulo: 'Alagamento (chuva/drenagem)', icone: '💧', cobrade: '1.2.3.0.0',
    campos: [
      { id: 'local', rotulo: 'O que está alagado?', tipo: 'select',
        opcoes: ['Rua/via', 'Terreno/pátio', 'Residência', 'Comércio/escola'], obrigatorio: true },
      { id: 'bueiro', rotulo: 'Há boca de lobo/bueiro entupido no local?', tipo: 'select',
        opcoes: ['Não sei', 'Não', 'Sim'], obrigatorio: false },
    ] },
  { chave: 'enxurrada', rotulo: 'Enxurrada (correnteza forte)', icone: '🌀', cobrade: '1.2.2.0.0',
    campos: [
      { id: 'arrasto', rotulo: 'A correnteza arrastou algo?', tipo: 'select',
        opcoes: ['Não', 'Objetos/lixo', 'Veículo', 'Parte de construção'], obrigatorio: true },
      { id: 'pessoas_risco', rotulo: 'Há pessoas em risco agora?', tipo: 'select',
        opcoes: ['Não', 'Sim'], obrigatorio: true },
    ] },
  { chave: 'destelhamento', rotulo: 'Destelhamento / vendaval', icone: '🌬️', cobrade: '1.3.2.1.5',
    campos: [
      { id: 'extensao', rotulo: 'Extensão do dano no telhado', tipo: 'select',
        opcoes: ['Poucas telhas', 'Parte do telhado', 'Telhado inteiro'], obrigatorio: true },
      { id: 'moradia_habitavel', rotulo: 'A moradia segue habitável?', tipo: 'select',
        opcoes: ['Sim', 'Parcialmente', 'Não'], obrigatorio: true },
      { id: 'precisa_lona', rotulo: 'Precisa de lona?', tipo: 'select',
        opcoes: ['Sim', 'Não'], obrigatorio: true },
    ] },
  { chave: 'granizo', rotulo: 'Granizo', icone: '🧊', cobrade: '1.3.2.1.3',
    campos: [
      { id: 'danos', rotulo: 'Principais danos', tipo: 'select',
        opcoes: ['Telhado', 'Veículo', 'Lavoura/horta', 'Vários'], obrigatorio: true },
    ] },
  { chave: 'deslizamento', rotulo: 'Deslizamento de terra', icone: '⛰️', cobrade: '1.1.3.2.1',
    campos: [
      { id: 'atingiu', rotulo: 'O deslizamento atingiu', tipo: 'select',
        opcoes: ['Terreno/encosta', 'Via/estrada', 'Residência'], obrigatorio: true },
      { id: 'rachaduras', rotulo: 'Há rachaduras novas em casa/muro?', tipo: 'select',
        opcoes: ['Não', 'Sim'], obrigatorio: true },
      { id: 'pessoas_risco', rotulo: 'Há pessoas em área de risco agora?', tipo: 'select',
        opcoes: ['Não', 'Sim'], obrigatorio: true },
    ] },
  { chave: 'estiagem', rotulo: 'Estiagem / falta de água', icone: '☀️', cobrade: '1.4.1.1.0',
    campos: [
      { id: 'situacao', rotulo: 'Situação principal', tipo: 'select',
        opcoes: ['Falta de água para consumo', 'Prejuízo na lavoura', 'Animais sem água', 'Poço/fonte secou'], obrigatorio: true },
      { id: 'dias', rotulo: 'Há quantos dias?', tipo: 'number', obrigatorio: false },
    ] },
];

const chaveOk = (req) =>
  process.env.ANA_SYNC_TOKEN && req.query.chave === process.env.ANA_SYNC_TOKEN;

/* ── GET /api/cidadao/tipos ───────────────────────────────────────────────── */
router.get('/tipos', (req, res) => res.json({ tipos: TIPOS }));

/* ── POST /api/cidadao/relato (multipart) ─────────────────────────────────── */
router.post('/relato', upload.array('fotos', 3), async (req, res) => {
  try {
    const b = req.body || {};
    if (b.consentimento !== 'sim')
      return res.status(400).json({ erro: 'consentimento LGPD é obrigatório' });
    if (!b.nome || !b.telefone)
      return res.status(400).json({ erro: 'nome e telefone são obrigatórios' });
    const tipo = TIPOS.find(t => t.chave === b.tipo);
    if (!tipo) return res.status(400).json({ erro: 'tipo de fenômeno inválido' });
    const files = req.files || [];
    if (!files.length)
      return res.status(400).json({ erro: 'envie ao menos 1 foto (recomendado: 3)' });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
      return res.status(500).json({ erro: 'SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados' });

    // protocolo oficial
    const seq = await db.query("SELECT nextval('seq_protocolo_cidadao')::int AS n");
    const protocolo = 'SGA-' + new Date().getFullYear() + '-' +
                      String(seq.rows[0].n).padStart(6, '0');

    // metadados de cada foto (lat/lng/ts capturados NO MOMENTO da foto, no app)
    let metas = [];
    try { metas = JSON.parse(b.foto_meta || '[]'); } catch (_) {}

    // upload das fotos ao Storage (service key — nunca exposta ao app)
    const base = process.env.SUPABASE_URL.replace(/\/$/, '');
    const fotos = [];
    for (let i = 0; i < files.length; i++) {
      const caminho = protocolo + '/' + (i + 1) + '.jpg';
      const r = await fetch(base + '/storage/v1/object/relatos/' + caminho, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
          'Content-Type': files[i].mimetype || 'image/jpeg',
          'x-upsert': 'true',
        },
        body: files[i].buffer,
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw new Error('upload foto ' + (i + 1) + ': HTTP ' + r.status);
      const m = metas[i] || {};
      fotos.push({
        url: base + '/storage/v1/object/public/relatos/' + caminho,
        lat: m.lat != null ? +m.lat : null,
        lng: m.lng != null ? +m.lng : null,
        ts: m.ts || null,
      });
    }

    let respostas = null;
    try { respostas = JSON.parse(b.respostas || 'null'); } catch (_) {}

    await db.query(
      `INSERT INTO relatos_cidadao
         (protocolo, nome, telefone, email, consentimento, tipo, cobrade,
          descricao, respostas, endereco, cod_ibge, municipio_nome, lat, lng, fotos, historico)
       VALUES ($1,$2,$3,$4,true,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
               jsonb_build_array(jsonb_build_object('em', now(), 'para', 'recebido')))`,
      [protocolo, String(b.nome).slice(0, 120), String(b.telefone).slice(0, 30),
       b.email ? String(b.email).slice(0, 120) : null,
       tipo.chave, tipo.cobrade,
       b.descricao ? String(b.descricao).slice(0, 2000) : null,
       respostas ? JSON.stringify(respostas) : null,
       b.endereco ? String(b.endereco).slice(0, 300) : null,
       b.cod_ibge ? parseInt(b.cod_ibge, 10) : null,
       b.municipio_nome || null,
       b.lat ? +b.lat : null, b.lng ? +b.lng : null,
       JSON.stringify(fotos)]);

    res.status(201).json({ ok: true, protocolo,
      mensagem: 'Relato registrado. Guarde seu protocolo para acompanhar.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* ── GET /api/cidadao/relato/:protocolo?tel=... (cidadão acompanha) ───────── */
router.get('/relato/:protocolo', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT protocolo, criado_em, tipo, cobrade, status, historico, municipio_nome,
              telefone
         FROM relatos_cidadao WHERE protocolo = $1`, [req.params.protocolo.toUpperCase()]);
    if (!rows.length) return res.status(404).json({ erro: 'protocolo não encontrado' });
    const r = rows[0];
    const tel = String(req.query.tel || '').replace(/\D/g, '').slice(-8);
    const telOk = tel && String(r.telefone || '').replace(/\D/g, '').endsWith(tel);
    if (!telOk) return res.status(403).json({ erro: 'informe o telefone usado no cadastro' });
    delete r.telefone;
    res.json(r);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* ── PREFEITURA: lista completa (com dados do cidadão) ────────────────────── */
router.get('/relatos', async (req, res) => {
  try {
    if (!chaveOk(req)) return res.status(403).json({ erro: 'chave inválida' });
    const limite = Math.min(parseInt(req.query.limite || '100', 10), 300);
    const ibge = req.query.ibge ? parseInt(req.query.ibge, 10) : null;
    const status = req.query.status || null;
    const { rows } = await db.query(
      `SELECT r.*, c.denominacao AS cobrade_nome
         FROM relatos_cidadao r LEFT JOIN cobrade c ON c.codigo = r.cobrade
        WHERE ($1::int  IS NULL OR r.cod_ibge = $1)
          AND ($2::text IS NULL OR r.status = $2)
        ORDER BY r.criado_em DESC LIMIT $3`, [ibge, status, limite]);
    res.json({ total: rows.length, relatos: rows });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

/* ── PREFEITURA: mudança de status (com trilha) ───────────────────────────── */
router.patch('/relato/:id/status', express.json(), async (req, res) => {
  try {
    if (!chaveOk(req)) return res.status(403).json({ erro: 'chave inválida' });
    const { status, obs } = req.body || {};
    const VALIDOS = ['recebido', 'em_analise', 'em_atendimento', 'resolvido', 'improcedente'];
    if (!VALIDOS.includes(status)) return res.status(400).json({ erro: 'status inválido' });
    const r = await db.query(
      `UPDATE relatos_cidadao SET status = $2, atualizado_em = now(),
              historico = historico || jsonb_build_object(
                'em', now(), 'para', $2::text, 'obs', $3::text)
        WHERE id = $1 RETURNING protocolo, status`, 
      [parseInt(req.params.id, 10), status, obs || null]);
    if (!r.rows.length) return res.status(404).json({ erro: 'relato não encontrado' });
    res.json({ ok: true, ...r.rows[0] });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;