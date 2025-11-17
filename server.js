const { getCluster } = require('./scripts/cluster')
const express = require('express');
const cors = require('cors');
const { timeout } = require('puppeteer');
const { addHistorico, saveJSON, addHistoricoPrograma, historicoObj } = require('./scripts/utils/dataHandler')
const app = express();
const path = require('path');
const { programas, whatsappConst } = require('./data/constants');

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos, como audiencia.html
app.use(express.static(path.join(__dirname)));

let historicoPrograma = [];

let historicoTotal =[];

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

async function sendWhatsapp(data, linksICL, programaICL, teste){
  let historicoICL = [];

  for (let res of data){
    let encontrado = linksICL.find(a => a === res.link);
    if (encontrado){
      historicoICL.push(res);
    }
  }

  let grupoWhatsapp;

  if (teste){ grupoWhatsapp = whatsappConst['grupoTeste']; }
  else { grupoWhatsapp = whatsappConst['grupoAudiencia']; }

  let whatsappSend = await fetch('http://localhost:8000/api/whatsapp', {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      grupo: grupoWhatsapp,
      audiencia: `${ JSON.stringify(historicoICL) }`,
      programa: programaICL })
    })

  let status = await whatsappSend.json();
  console.log(status.status);
}


app.post('/api/raspar', async (req, res) => {
  let { links, canaisICL, programa, nomePrograma, teste, historicoModular, programacao } = req.body;
  
  if (historicoModular === undefined){
    historicoModular = new historicoObj();
  }
  
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

  const resultados = []; 

  resultadosSettled.forEach(res => {
    if (res.status === 'fulfilled') {
      resultados.push(res.value);
    } else {
      console.error('Um scrape falhou:', res.reason?.message || res.reason);
    }
  });

  let timestamp = new Date().toLocaleTimeString();

  historicoModular.resultados = addHistorico(historicoModular.resultados, resultados, timestamp);

  historicoPrograma = addHistoricoPrograma(historicoModular.resultados, historicoPrograma, programa, timestamp, canaisICL);


  try{
    sendWhatsapp(historicoModular.resultados, canaisICL, programaAtual, teste);
  }
  
  catch{
    console.log('Não foi possível mandar mensagem. Ligue a porta do whatsapp');
  }

  if (programacao){
      saveJSON(historicoModular, historicoPrograma);
  };

  res.json({ historicoModular, programaAtual });
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