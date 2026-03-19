const { Pool } = require("pg");

const pool = new Pool({
    user: 'postgres', host: 'localhost', database: 'audiencia_icl',
    password: 'ICLAudiencia@123456', port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Erro de conexão com o Postgres:', err.message);
  else console.log('Conexão com o banco "audiencia_icl" confirmada!');
});


module.exports = pool;