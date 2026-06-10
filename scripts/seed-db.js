require('dotenv').config();
const { Pool }   = require('pg');
const municipios = require('../src/assets/data/municipios_rs.json');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  console.log(`Importando ${municipios.length} municípios para o Supabase...`);
  let ok = 0;

  for (const m of municipios) {
    await pool.query(`
      INSERT INTO municipios
        (id, nome, cod_ibge, lat, lng, populacao,
         mesorregiao, microrregiao, bacia_hidrografica,
         risco_tipo, risco_nivel, risco_nivel_str,
         risco_score_ia, risco_cor, ana_cod, cemaden_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (cod_ibge) DO UPDATE SET
        risco_score_ia = EXCLUDED.risco_score_ia,
        updated_at = NOW()
    `, [
      m.id, m.nome, m.cod_ibge, m.lat, m.lng, m.populacao,
      m.mesorregiao, m.microrregiao, m.bacia_hidrografica,
      m.risco.tipo, m.risco.nivel, m.risco.nivel_str,
      m.risco.score_ia, m.risco.cor,
      m.estacoes.ana_cod, m.estacoes.cemaden_id
    ]);
    ok++;
    if (ok % 50 === 0) console.log(`  ${ok}/${municipios.length}...`);
  }

  console.log(`\n✅ ${ok} municípios importados com sucesso!`);
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});