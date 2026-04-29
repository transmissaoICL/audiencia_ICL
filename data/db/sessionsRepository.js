const pool = require("./db");

async function iniciarSessaoDB(id, tipo, webnario) {
    let prog;
    if (tipo){
        prog = "programação";
    } 
    else if (!tipo && webnario)
    { 
        prog = "webnario";
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

async function loadSessao(sessaoID) {
    try {
        // Usamos um JOIN para buscar os canais da última leitura dessa sessão em uma única tacada
        const query = `
            SELECT 
                dc.plataforma, 
                dc.canal_nome, 
                dc.link_icl, 
                dc.link_url 
            FROM detalhes_canais dc
            JOIN leituras l ON dc.leitura_id = l.id
            WHERE l.session_id = $1
            AND l.id = (SELECT MAX(id) FROM leituras WHERE session_id = $1)
        `;

        const result = await pool.query(query, [sessaoID]); // Parametrização segura ($1)
        
        return result.rows; // O node-pg entrega os dados aqui
    } catch (err) {
        console.error("❌ Erro ao recuperar estado da sessão:", err.message);
        throw err;
    }
}

module.exports = { iniciarSessaoDB, recuperarSessoes, loadSessao };