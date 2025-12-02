const { getCluster } = require('./scripts/cluster')
const express = require('express');
const cors = require('cors');
const { timeout } = require('puppeteer');
const { addHistorico, saveJSON, addHistoricoPrograma, historicoObj } = require('./scripts/utils/dataHandler')
const app = express();
const path = require('path');
const { programas, whatsappConst } = require('./data/constants');
const { startWhatsApp, sendToGroup } = require('./scripts/utils/whatsappClient');

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos, como audiencia.html
app.use(express.static(path.join(__dirname)));

startWhatsApp();

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

async function sendWhatsapp(data, linksICL, programaICL, teste) {
    
    // 1. Filtra e processa os dados (mantive sua lógica original de filtro)
    let dadosFiltrados = [];
    for (let res of data) {
        let encontrado = linksICL.find(a => a === res.link);
        if (encontrado) {
            dadosFiltrados.push(res);
        }
    }

    // 2. Define o grupo
    let grupoAlvo;
    if (teste) { 
        grupoAlvo = whatsappConst['grupoTeste']; // Certifique-se que isso é o Nome ou ID
    } else { 
        grupoAlvo = whatsappConst['grupoAudiencia']; 
    }

    // 3. Monta a mensagem (traduzindo sua lógica Python para JS)
    const mensagem = formatarMensagem(dadosFiltrados, programaICL);

    // 4. ENVIA DIRETO (Sem fetch, sem servidor python)
    // O próprio client gerencia a fila interna de mensagens
    await sendToGroup(grupoAlvo, mensagem);
}

// Helper para formatar texto (versão JS da sua função python)
function formatarMensagem(data, programa) {
    let audiencia_yt = 0;
    let audiencia_fb = 0;
    let audiencia_insta = 0;

    data.forEach(canal => {
        // Assume que a estrutura de dados é a mesma que chega no python
        // Adapte conforme o retorno real do seu scraper
        if(canal.plataforma === 'YouTube') audiencia_yt += Object.values(canal.dadosHistoricos).at(-1) || 0;
        if(canal.plataforma === 'Facebook') audiencia_fb += Object.values(canal.dadosHistoricos).at(-1) || 0;
        if(canal.plataforma === 'Instagram') audiencia_insta += Object.values(canal.dadosHistoricos).at(-1) || 0;
        // Nota: simplifiquei aqui, mas se precisar pegar do histórico:
        // let keys = Object.keys(canal.dadosHistoricos || {});
        // let lastVal = keys.length ? canal.dadosHistoricos[keys[keys.length-1]] : 0;
    });

    let total = audiencia_yt + audiencia_fb + audiencia_insta;
    let hoje = new Date().toLocaleDateString('pt-BR');

    return `*${hoje} - ${programa} - Audiência:*\n\n` +
           `Facebook: ${audiencia_fb} - YouTube: ${audiencia_yt} - Instagram: ${audiencia_insta}\n\n` +
           `Total: ${total}`;
}

app.post('/api/raspar', async (req, res) => {
  let { links, canaisICL, programa, nomePrograma, teste, historicoModular, programacao, periodo } = req.body;
  
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

  historicoPrograma = addHistoricoPrograma(historicoModular.resultados, historicoPrograma, programa, timestamp, canaisICL, programaAtual);


  try{
    sendWhatsapp(historicoModular.resultados, canaisICL, programaAtual, teste);
  }
  
  catch{
    console.log('Não foi possível mandar mensagem. Ligue a porta do whatsapp');
  }

  if (programacao){
    saveJSON(historicoModular, historicoPrograma, periodo);
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