const puppeteer = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');
const express = require('express');
const cors = require('cors');
const { timeout } = require('puppeteer');
const { addHistorico, saveJSON, addHistoricoPrograma } = require('./scripts/utils/dataHandler')
const app = express();
const path = require('path');
const { programas, whatsappConst } = require('./data/constants');

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos, como audiencia.html
app.use(express.static(path.join(__dirname)));

let historico = [];
let historicoICL = [];

let historicoTotal =[];

const account = {
  username: "celioglicerio",
  password: "ICL@audiencia123456"
}


const facebookDict = {
  'eduardomoreirabrasil': "Eduardo Moreira está ao vivo",
  'institutoconhecimentoliberta': "Instituto Conhecimento Liberta está ao vivo",
  'profile.php?id=100083958152654': "ICL Notícias está ao vivo"
}

const instaElements = {
  aria_label: 'Ícone do Contador de visualizadores',
  ao_vivo: 'AO VIVO',
}

async function rasparYouTube(page, link) {
  let canal = '-';
  let viewers = 0;

  try {
    await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });

    // Nome do canal
    try {
      const seletor = '#channel-name a';
      await page.waitForSelector(seletor, { timeout: 10000 });
      canal = await page.$eval(seletor, el => el.textContent.trim());
    } catch {
      console.warn(`Canal YouTube não encontrado via #channel-name. Link: ${link}`);
    }    

    // Viewers
    try {
      await page.waitForSelector(".view-count", { timeout: 5000 });

      const audiencia = await page.evaluate(() => document.querySelector(".view-count").outerText);

      if (audiencia.match("aguardando") || audiencia.match("waiting") || audiencia.match("vizualizações")){
        console.warn("Live não iniciada");
      }
      if (audiencia.match("assistindo") || audiencia.match("watching")){
        viewers = parseInt(audiencia.split(" ")[0].replace(",", ""));
      }
      } catch (err){
        console.warn(`Falha ao pegar audiencia: ${err.message}`);
      }

    } catch (err) {
      console.warn(`Falha ao acessar YouTube: ${err.message}`);
    }
    return { plataforma: 'YouTube', canal, viewers, link };  
  }


async function rasparFacebook(page, link) {
  let canal = '-';
  let viewers = 0;

  let url = link;
  let result = url.split('facebook.com/')[1];

  try {
    // Checa se já está logado
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 10000 });
    const isLoggedIn = await page.evaluate(() => !document.querySelector('input[name="email"]'));

    if (!isLoggedIn) {
      console.log("Fazendo login no Facebook...");
      await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2', timeout: 10000 });

      await page.type('input[name="email"]', 'leonardo.salles@icl.com.br', { delay: 100 });
      await page.type('input[name="pass"]', 'Lovisquok@33', { delay: 100 });

      await Promise.all([
        page.click('#loginbutton'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
    }

    await page.goto(link, { waitUntil: 'networkidle2', timeout: 5000 });

    try {
    await page.click(`a[role="link"][aria-label="${facebookDict[result]}"]`);
    }
    catch (err) { console.log(err.message) }

    // Nome do canal
    try {
      await page.waitForSelector('h2 strong', { timeout: 5000 });
      canal = await page.$eval('h2 strong', el => el.textContent.trim());
    } catch {
      console.warn(`Nome do canal não encontrado: ${link}`);
    }

    // Audiência
    try {
      await page.waitForFunction(() => {
        const spans = document.querySelectorAll('div[role="img"] span[dir="auto"]');
        return Array.from(spans).some(span => span.textContent && /^\d/.test(span.textContent.trim()));
      }, { timeout: 10000 });

      const rawViewers = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('div[role="img"] span[dir="auto"]'));
        for (const span of spans) {
          const text = span.textContent.trim();
          if (/^\d/.test(text)) return text;
        }
        return '0';
      });

      viewers = parseInt(rawViewers.replace(/\./g, '').replace(',', '')) || 0;
    } catch (err) {
      console.warn(`Falha ao capturar audiência do Facebook: ${err.message}`);
    }

  } catch (err) {
    throw new Error(`Erro ao acessar Facebook: ${err.message}`);
  }

  return { plataforma: 'Facebook', canal, viewers, link };
}



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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rasparInstagram(page, link) {
  let canal = '-';
  let viewers = 0;

  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

  try {
    // Aguarda especificamente os campos certos
    await page.waitForSelector('input[name="username"]', { timeout: 1000 });
    await page.waitForSelector('input[name="password"]', { timeout: 1000 });

    await page.type('input[name="username"]', account.username, { delay: 100 });
    await page.type('input[name="password"]', account.password, { delay: 100 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // Fecha popups se aparecerem
    try {
      await page.waitForSelector('button:has-text("Agora não")', { timeout: 5000 });
      await page.click('button:has-text("Agora não")');
    } catch {}

    try {
      await page.waitForSelector('button:has-text("Agora não")', { timeout: 5000 });
      await page.click('button:has-text("Agora não")');
    } catch {}

  } catch (err) {
    console.log("Erro durante login no Instagram:", err.message);
  }

  try {
    try{
      const profilePage = link.slice(0, -5);
      await page.goto(profilePage, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const clickable = await page.$$('span');
      for (const spans of clickable){
        const spanText = await (await spans.getProperty('innerText')).jsonValue();
        if ( spanText.includes('LIVE') || spanText.includes('AO VIVO')){
          await spans.click();
          break;
        }
      }
    } catch(err){
      console.warn(`Erro ao entrar na Live: ${err.message}`);
    }

    await sleep(1000);

    // Pega número de viewers
    const rawViewers = await page.evaluate(() => {
      const span = document.querySelector('span.html-span');
      return span?.outerText || '0';
    }, instaElements.aria_label);

    const cleaned = rawViewers.replace(/[^\d]/g, '');
    viewers = parseInt(cleaned) || 0;

    // Nome do canal (genérico)
    try {
      canal = await page.evaluate(() => {
        const el = document.querySelector('div[dir="auto"]').outerText;
        return el ? el.textContent.trim() : '-';
      });
    } catch (err){
      console.warn(`Nome do canal do Instagram não encontrado: ${err.message}`);
    }

  } catch (err) {
    console.warn(`Erro ao raspar Instagram: ${err.message}`);
  }

  return { plataforma: 'Instagram', canal, viewers, link };
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
  let { links, linksICL, programa, nomePrograma, teste } = req.body;
  let resultados = [];

  let programaAtual;

  if (programa === 13){
    programaAtual = nomePrograma;
  }

  else{
    programaAtual = programas[programa];
  }

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,  // ou BROWSER para isolamento total
    maxConcurrency: 2,
    puppeteerOptions: {
      headless: false,
      userDataDir: './tmp/session',
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox', '--window-position=-32000,-32000',]
    }
  });
// '--window-position=-32000,-32000',
  await cluster.task(async ({ page, data: { link } }) => {
    let resultado;
    if (link.includes('youtube.com')) {
      resultado = await rasparYouTube(page, link);
    } else if (link.includes('facebook.com')) {
      resultado = await rasparFacebook(page, link);
    } else if (link.includes('twitch.tv')) {
      resultado = await rasparTwitch(page, link);
    } else if (link.includes('instagram.com')) {
      resultado = await rasparInstagram(page, link);
    } else {
      resultado = { plataforma: 'Desconhecida', canal: '-', viewers: 0, link };
    }

    resultados.push(resultado);
  });

  for (const link of links) {
    await cluster.queue({ link });
  }

  // Espera tudo terminar
  await cluster.idle();
  await cluster.close();

  let timestamp = new Date().toLocaleTimeString();

  historico = addHistorico(historico, resultados, timestamp);

  historicoICL = addHistoricoPrograma(resultados, historicoICL, programa, timestamp);

  try{
    sendWhatsapp(historico, linksICL, programaAtual, teste);
  }
  
  catch{
    console.log('Não foi possível mandar mensagem. Ligue a porta do whatsapp');
  }

  res.json({ historico, programaAtual });
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});

setInterval(() => {
    saveJSON(historico, historicoICL);
}, 720000);


process.on('SIGINT', async () => {
  console.log('\nEncerrando servidor...');
  server.close(() => {
    console.log('Servidor Express encerrado.');
    process.exit(0);
  });
});