CREATE TABLE IF NOT EXISTS sessoes (
    id VARCHAR(50) PRIMARY KEY,
    tipo VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leituras (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES sessoes(id) ON DELETE CASCADE,
    programa_atual VARCHAR (50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_geral INT
);

CREATE TABLE IF NOT EXISTS detalhes_canais (
    id SERIAL PRIMARY KEY,
    leitura_id INTEGER REFERENCES leituras(id) ON DELETE CASCADE,
    plataforma VARCHAR(50),
    canal_nome VARCHAR(255),
    audiencia INTEGER,
    link_icl BOOLEAN DEFAULT false,
    link_url TEXT
);