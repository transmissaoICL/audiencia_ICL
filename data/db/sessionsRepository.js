const pool = require("./db");

async function iniciarSessaoDB(id, tipo) {
    await pool.query(
        'INSERT INTO sessoes (id, tipo) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [id, tipo]
    );
    console.log("Sessão de Base de Dados Iniciada!");
}

module.exports = { iniciarSessaoDB };