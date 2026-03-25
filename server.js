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
const { registraLeituraDB } = require('./data/db/leiturasRepository');
const { montarHtmlParaPrint } = require('./scripts/utils/tablePrint');
require('dotenv').config();


app.use(cors());
app.use(express.json());

// Servir arquivos estáticos, como audiencia.html
app.use(express.static(path.join(__dirname)));


startWhatsApp();


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
  const { sessionID, tipo } = req.body;
  await iniciarSessaoDB(sessionID, tipo);
  res.json({ success: true });
})

app.post('/api/raspar', async (req, res) => {
  let { sessionID, links, canaisICL, programa, nomePrograma, teste, webnario } = req.body;
  
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
  

  let total = 0;
  dadosFiltrados.forEach(dado =>{
    total += Object.values(dado.dadosHistoricos).at(-1) || 0
  })

  try {
      await registraLeituraDB(sessionID, total, programaAtual, resultadoHistorico);
      console.log("Audiencia Salva com Sucesso!");
      res.json({ success: true, historicoModular, programaAtual });
  } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});

process.on('SIGINT', async () => {
  console.log('\nEncerrando servidor...');
  server.close(() => {
    console.log('Servidor Express encerrado.');
    process.exit(0);
  });
});