const pool = require("./db");

async function iniciarSessaoDB(id, tipo) {
    let prog;
    if (tipo){
        prog = "programação";
    } else { prog = "especial" }
    await pool.query(
        'INSERT INTO sessoes (id, tipo) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [id, prog]
    );
    console.log("Sessão de Base de Dados Iniciada!");
}

async function recuperarSessoes(){
    // Busca as últimas 10 sessões para o usuário escolher
    const result = await pool.query(
        'SELECT id, tipo, criado_em FROM sessoes ORDER BY criado_em DESC LIMIT 10'
    );
    return result.rows;
}

module.exports = { iniciarSessaoDB, recuperarSessoes };