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

async function carregaLeituraDB(sessionID){
  const client = await pool.connect();

  await client.query('BEGIN');

  const query = `
    SELECT 
    dc.canal_nome, 
    dc.plataforma, 
    dc.audiencia, 
    to_char(l.timestamp, 'HH24:MI') as hora_minuto
    FROM detalhes_canais dc
    INNER JOIN leituras l ON dc.leitura_id = l.id
    WHERE l.session_id = $1 and dc.audiencia != 0
    ORDER BY l.timestamp ASC; 
  `
  const res = await client.query(query, [sessionID]);
  
  return res.rows;

}

module.exports = { registraLeituraDB, carregaLeituraDB }