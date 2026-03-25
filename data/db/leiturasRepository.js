const pool = require("./db");

async function registraLeituraDB(sessionID, totalGeral, programa, detalhes){
  const client = await pool.connect();
  try{
    await client.query('BEGIN');
    const res = await client.query(
      'INSERT INTO leituras (session_id, programa_atual, timestamp, total_geral) VALUES ($1, $2, NOW(), $3) RETURNING id',[sessionID, programa, totalGeral]
    );
    const leituraID = res.rows[0].id;
    for (const d of detalhes){
      await client.query(
        'INSERT INTO detalhes_canais (leitura_id, plataforma, canal_nome, audiencia, link_icl, link_url) VALUES ($1, $2, $3, $4, $5, $6)',
        [leituraID, d.plataforma, d.canal, Object.values(d.dadosHistoricos).at(-1), d.icl, d.link]
      );
    }
    await client.query('COMMIT');
    console.log("Leitura Registrada!");
  }
  catch (err){
    await client.query('ROLLBACK');
    console.log(`Erro na Leitura: ${err}`);
    throw err;
  }
  finally {
    client.release();
  }
}

module.exports = { registraLeituraDB }