const { getCluster } = require('./scripts/cluster')
const express = require('express');
const cors = require('cors');
const { timeout } = require('puppeteer');
const { addHistorico, historicoObj } = require('./scripts/utils/dataHandler')
const app = express();
const path = require('path');
const { programas } = require('./data/constants');
const { startWhatsApp, sendWhatsapp, enviarRelatorioWpp } = require('./scripts/utils/whatsappClient');
const { iniciarSessaoDB, recuperarSessoes, loadSessao } = require('./data/db/sessionsRepository');
const { registraLeituraDB, carregaLeituraDB } = require('./data/db/leiturasRepository');
const { montarHtmlParaPrint } = require('./scripts/utils/tablePrint');
require('dotenv').config();


app.use(cors());
app.use(express.json());

// Servir arquivos estáticos, como audiencia.html
app.use(express.static(path.join(__dirname)));


startWhatsApp();

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app); // O app do Express entra aqui
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket'] // 🚀 SINCRONIZA COM O CLIENTE
});

// Configuração de Salas
io.on('connection', (socket) => {
    socket.on('join_session', (sessionID) => {
        socket.join(sessionID);
        console.log(`👤 Usuário monitorando sessão: ${sessionID}`);
    });
});


async function rasparTwitch(page, link) {
  let canal = '-';
  let viewers = 0;

  try {
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Nome do canal (live)
    try {
      canal = await page.title();
    } catch {
      console.warn('Canal Twitch não encontrado');
    }

    // Viewers (live)
    try {
      viewers = await page.$eval('[data-a-target="animated-channel-viewers-count"]', el => {
        const text = el.textContent.replace(/[^\d]/g, '');
        return parseInt(text) || 0;
      });
    } catch {
      console.warn('Viewers Twitch não encontrado');
    }

  } catch (err) {
    throw new Error(`Falha ao acessar Twitch: ${err.message}`);
  }

  return { plataforma: 'Twitch', canal, viewers, link };
}

app.post('/api/sessoes/loadSessao', async (req, res) => {
  try {
    const { sessionID } = req.body;
    const rows = await loadSessao(sessionID);
    res.json(rows);
  }
  catch(err){

  }
});

app.get('/api/sessoes/recentes', async (req, res) => {
    try {
      let sessoes = await recuperarSessoes();
      return res.json(sessoes);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/sessoes/iniciar', async (req, res) =>{
  const { sessionID, tipo, webnario } = req.body;
  await iniciarSessaoDB(sessionID, tipo, webnario);
  res.json({ success: true });
})

app.post('/api/raspar', async (req, res) => {
  let { sessionID, links, canaisICL, programa, nomePrograma, teste, programacao, webnario, printToggle } = req.body;
  
  historicoModular = new historicoObj();
  
  let programaAtual;

  if (programa === 13){
    programaAtual = nomePrograma;
  }

  else{
    programaAtual = programas[programa];
  }

  console.log('Obtendo Cluster...')
  const cluster = await getCluster();
  console.log('Cluster Pronto');

  const promessasDeScrape = links.map(link => {
      return cluster.execute({ link }); 
    });

  const resultadosSettled = await Promise.allSettled(promessasDeScrape);

  console.log('Scrapes concluídos. Processando sucessos e falhas...');

  let resultados = []; 

  resultadosSettled.forEach(res => {
    if (res.status === 'fulfilled') {
      resultados.push(res.value);
    } else {
      console.error('Um scrape falhou:', res.reason?.message || res.reason);
    }
  });

  let timestamp = new Date().toLocaleTimeString();

  historicoModular.resultados = addHistorico(historicoModular.resultados, resultados, timestamp);
  let resultadoHistorico = historicoModular.resultados;

    // Calcula o total para ser enviado para a DB
  let dadosFiltrados = [];
  for (let res of resultadoHistorico) {
      let encontrado = canaisICL.find(a => a === res.link);
      if (encontrado) {
        res.icl = true;
        dadosFiltrados.push(res);
      }
  }

  try{
    sendWhatsapp(resultadoHistorico, canaisICL, programaAtual, teste, webnario);
  }
  
  catch{
    console.log('Não foi possível mandar mensagem. Ligue a porta do whatsapp');
  }

  // Tarefa específica para gerar o Print
  if (printToggle){
    const taskGerarPrint = async ({ page, data: { resultadoHistorico, programaAtual } }) => {
    const html = montarHtmlParaPrint(resultadoHistorico, programaAtual);
    await page.setContent(html);

    // Seleciona o elemento que você definiu
    const element = await page.$('#tabelaConcorrencia');

    // Tira o print apenas desse elemento
    return await element.screenshot({ encoding: 'base64', omitBackground: true });
    };

 
  // O Cluster executa a tarefa sem travar o loop principal
    cluster.execute({ resultadoHistorico, programaAtual }, taskGerarPrint)
      .then(base64 => {
          // Chama o módulo do WhatsApp enviando o base64
          enviarRelatorioWpp(base64, teste);
      })
      .catch(err => console.error("Erro ao gerar print no cluster:", err));
  }
  
  

  let total = 0;
  dadosFiltrados.forEach(dado =>{
    total += Object.values(dado.dadosHistoricos).at(-1) || 0
  })

  // TODO: Introduzir Logica de Socket
  const resultadoParaBroadcast = {
    historicoModular: historicoModular,
    programaAtual: programaAtual
  };

  io.to(sessionID).emit('audiencia_atualizada', resultadoParaBroadcast);

  try {
      await registraLeituraDB(sessionID, total, programaAtual, resultadoHistorico);
      console.log("Audiencia Salva com Sucesso!");
      res.json({ success: true, historicoModular, programaAtual });
  } catch (err) {
      res.status(500).json({ error: err.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

app.get('/api/sessoes/historico/:sessionID', async (req, res) => {
  const { sessionID } = req.params;

  try{
    let leituras = await carregaLeituraDB(sessionID);

    const historicoFormatado = leituras.reduce((acc, row) => {
      // Verifica se o canal já foi adicionado ao array de resultados
      let canal = acc.find(c => c.canal === row.canal_nome);
      
      if (!canal) {
          canal = {
              canal: row.canal_nome,
              plataforma: row.plataforma,
              dadosHistoricos: {} // Objeto que o seu inline.js espera
          };
          acc.push(canal);
      }
      
      // Adiciona a audiência no horário correspondente
      canal.dadosHistoricos[row.hora_minuto] = row.audiencia;
      return acc;
    }, []);
    res.json(historicoFormatado);
  }
  catch(err){
    console.log(`Erro ao carregar leituras: ${ err }`);
  }
});

app.post('/api/pesquisa-avancada', async (req, res) => {
  const { 
      programa, dataInicio, dataFim, horaInicio, horaFim, 
      intervalo, canais, consolidarICL, sessionID 
  } = req.body;

  const canalFiltro = canais ? canais.split(',').map(c => c.trim()) : [];
  
  // Lógica de Agrupamento por Tempo (Intervalo de dados)
  const timeGroup = `
      date_trunc('day', l.timestamp) + 
      (interval '1 minute' * (${intervalo} * floor(extract(minute from l.timestamp) / ${intervalo})))
  `;

  // Lógica de Nome do Canal (Consolidado ou Individual)
  const canalNameLogic = consolidarICL 
      ? `CASE WHEN dc.canal_nome ILIKE '%ICL%' THEN 'ICL CONSOLIDADO' ELSE dc.canal_nome END`
      : `dc.canal_nome`;

  let query = `
      SELECT 
          to_char(${timeGroup}, 'DD/MM HH24:MI') as momento,
          ${canalNameLogic} as canal,
          ROUND(AVG(dc.audiencia)) as media_audiencia,
          MAX(dc.audiencia) as pico_audiencia
      FROM detalhes_canais dc
      INNER JOIN leituras l ON dc.leitura_id = l.id
      WHERE l.session_id = $1
      AND l.timestamp::date BETWEEN $2 AND $3
      AND l.timestamp::time BETWEEN $4 AND $5
  `;

  const params = [sessionID, dataInicio, dataFim, horaInicio, horaFim];

  // Filtros Opcionais
  if (programa) {
      params.push(`%${programa}%`);
      query += ` AND dc.canal_nome ILIKE $${params.length}`;
  }

  if (canalFiltro.length > 0) {
      params.push(canalFiltro);
      query += ` AND dc.canal_nome = ANY($${params.length})`;
  }

  query += ` GROUP BY momento, canal, ${timeGroup} ORDER BY ${timeGroup} DESC, media_audiencia DESC`;

  try {
      const { rows } = await db.query(query, params);
      res.json(rows);
  } catch (err) {
      console.error(err);
      res.status(500).send("Erro na consulta avançada");
  }
});

process.on('SIGINT', async () => {
  console.log('\nEncerrando servidor...');
  server.close(() => {
    console.log('Servidor Express encerrado.');
    process.exit(0);
  });
});