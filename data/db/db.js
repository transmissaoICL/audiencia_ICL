const { Pool } = require("pg");
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'postgres',
    database: process.env.DB_NAME || 'audiencia_icl',
    password: process.env.DB_PASSWORD || 'ICLAudiencia@123456',
    port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Erro de conexão com o Postgres:', err.message);
  else console.log('Conexão com o banco "audiencia_icl" confirmada!');
});


module.exports = pool;