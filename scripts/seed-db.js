require('dotenv').config();
const path = require('path');
const { Pool } = require('pg');

// Caminho absoluto para o JSON — funciona independente de onde o script é rodado
const municipios = require(path.join(__dirname, '..', 'public', 'src', 'assets', 'data', 'municipios_rs.json'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  console.log(`Atualizando ${municipios.length} municipios no Supabase...`);
  let ok = 0, erros = 0;

  for (const m of municipios) {
    try {
      await pool.query(`
        INSERT INTO municipios
          (id, nome, cod_ibge, lat, lng, populacao,
           mesorregiao, microrregiao, bacia_hidrografica,
           risco_tipo, risco_nivel, risco_nivel_str,
           risco_score_ia, risco_cor, ana_cod, cemaden_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (cod_ibge) DO UPDATE SET
          nome               = EXCLUDED.nome,
          lat                = EXCLUDED.lat,
          lng                = EXCLUDED.lng,
          populacao          = EXCLUDED.populacao,
          mesorregiao        = EXCLUDED.mesorregiao,
          microrregiao       = EXCLUDED.microrregiao,
          bacia_hidrografica = EXCLUDED.bacia_hidrografica,
          risco_tipo         = EXCLUDED.risco_tipo,
          risco_nivel        = EXCLUDED.risco_nivel,
          risco_nivel_str    = EXCLUDED.risco_nivel_str,
          risco_score_ia     = EXCLUDED.risco_score_ia,
          risco_cor          = EXCLUDED.risco_cor,
          ana_cod            = EXCLUDED.ana_cod,
          cemaden_id         = EXCLUDED.cemaden_id,
          updated_at         = NOW()
      `, [
        m.id, m.nome, m.cod_ibge, m.lat, m.lng, m.populacao,
        m.mesorregiao, m.microrregiao, m.bacia_hidrografica,
        m.risco.tipo, m.risco.nivel, m.risco.nivel_str,
        m.risco.score_ia, m.risco.cor,
        m.estacoes.ana_cod, m.estacoes.cemaden_id
      ]);
      ok++;
      if (ok % 50 === 0) process.stdout.write(`  ${ok}/${municipios.length}...\n`);
    } catch(e) {
      erros++;
      console.error(`  Erro em ${m.nome}: ${e.message}`);
    }
  }

  console.log(`\nConcluido: ${ok} atualizados, ${erros} erros`);
  await pool.end();
}

seed().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
