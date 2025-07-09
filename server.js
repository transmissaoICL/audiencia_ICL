const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const account = {
  username: "celioglicerio",
  password: "ICL@audiencia123456"
}

const instaElements = {
  aria_label: 'Ícone do Contador de visualizadores',
  ao_vivo: 'AO VIVO',
}

async function rasparYouTube(page, link) {
  let canal = '-';
  let viewers = 0;

  try {
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Nome do canal (via ytd-channel-name)
    try {
      const seletor = '#channel-name a';
      await page.waitForSelector(seletor, { timeout: 60000 });
      canal = await page.$eval(seletor, el => el.textContent.trim());
    } catch {
      console.warn(`Canal YouTube não encontrado via #channel-name. Link: ${link}`);
    }

    // Viewers (ao vivo)
    try {
      const spans = await page.$$('span');
      for (const span of spans) {
        let text = await (await span.getProperty('textContent')).jsonValue();
        if (text.includes('assistindo agora')) {
          let match = text.match(/([\d\.,]+)/);
          if (match) {
            viewers = parseInt(match[1].replace(/\./g, '').replace(',', ''));
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Viewers YouTube não encontrado:', err.message);
    }

  } catch (err) {
    throw new Error(`Falha ao acessar YouTube: ${err.message}`);
  }

  return { plataforma: 'YouTube', canal, viewers, link };
}


async function rasparFacebook(page, link) {
  let canal = '-';
  let viewers = 0;

  try {
    await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });

    // Obter nome do canal
    try {
      await page.waitForSelector('h2 strong', { timeout: 10000 });
      canal = await page.$eval('h2 strong', el => el.textContent.trim());
    } catch {
      console.warn(`Nome do canal não encontrado no Facebook: ${link}`);
    }

    // Obter número de espectadores ao vivo
    try {
      await page.waitForTimeout(3000); // Pequena espera para garantir carregamento
      const spans = await page.$$eval('span[dir="auto"]', elements =>
        elements.map(span => span.textContent.trim())
      );

      const viewerText = spans.find(text =>
        /(ao vivo|assistindo|pessoas assistindo|visualizações)/i.test(text)
      );

      if (viewerText) {
        const match = viewerText.match(/([\d\.,]+)/);
        if (match) {
          viewers = parseInt(match[1].replace(/\./g, '').replace(',', '')) || 0;
        }
      } else {
        console.warn(`Texto de audiência não encontrado no Facebook: ${link}`);
      }
    } catch (err) {
      console.warn(`Erro ao capturar viewers do Facebook: ${err.message}`);
    }

  } catch (err) {
    throw new Error(`Falha ao acessar Facebook: ${err.message}`);
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

  try {
    try{
      // Login no Instagram
      await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
      await page.waitForSelector('input', { timeout: 10000 });

      await page.type('[type="text"]', account.username, { delay: 100 });
      await page.type('[type="password"]', account.password, { delay: 100 });

      await Promise.all([
        page.click('[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
    }
    catch (err){
      console.log(`Erro ao Logar no Instagram: ${err.message}`);
    }

    // Acessa o link da live
    await page.goto(link, { waitUntil: 'networkidle2' });

    try{
      // Aguarda botão da live
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('span')).find(it => it.outerText === instaElements.ao_vivo), { timeout: 10000 });
    }
    catch (err){
      console.log(`Erro ao Achar Live: ${err.message}`);
    }
    await sleep(1000);

    `
    try{
      // Clica no botão LIVE
      await page.evaluate(() => {
        const liveBtn = Array.from(document.querySelectorAll('span')).find(it => it.outerText === instaElements.ao_vivo)?.parentNode?.parentNode;
        if (liveBtn && liveBtn.querySelector('[role="link"]')) {
          liveBtn.querySelector('[role="link"]').click();
        }
      });
    }
    catch (err){
      console.log(Erro ao Clicar no Botão: {err.message});
    }`

    await sleep(1000)

    let button = await page.waitForSelector('button');

    button.click('button');

    // Espera contador aparecer
    // await page.waitForSelector(`[aria-label=${instaElements.aria_label}]`, { timeout: 10000 });

    // Garante que está na live
    const urlOk = await page.evaluate(() => location.href.includes('/live'));
    if (!urlOk) throw new Error('Falha ao abrir live do Instagram.');

    // Pega número de viewers
    const rawViewers = await page.evaluate(() => {
      const span = document.querySelector(`[aria-label=${instaElements.aria_label}]`)?.parentNode?.parentNode?.querySelector('span.html-span');
      return span?.outerText || '0';
    });

    viewers = parseInt(rawViewers.replace(/\./g, '').replace(',', '')) || 0;

    // Nome do canal (genérico)
    try {
      canal = await page.evaluate(() => {
        const el = document.querySelector('header h2, header span');
        return el ? el.textContent.trim() : '-';
      });
    } catch {
      console.warn('Nome do canal do Instagram não encontrado.');
    }

  } catch (err) {
    console.warn(`Erro ao raspar Instagram: ${err.message}`);
  }

  return { plataforma: 'Instagram', canal, viewers, link };
}



app.post('/api/raspar', async (req, res) => {
  let { links } = req.body;
  let resultados = [];

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
    //'--no-sandbox', '--disable-setuid-sandbox'
  });

  for (let link of links) {
    let page = await browser.newPage();
    let resultado;

    const handlers = [
      { test: 'youtube.com', fn: rasparYouTube, plataforma: 'YouTube' },
      { test: 'facebook.com', fn: rasparFacebook, plataforma: 'Facebook' },
      { test: 'twitch.tv', fn: rasparTwitch, plataforma: 'Twitch' },
      { test: 'instagram.com', fn: rasparInstagram, plataforma: 'Instagram' }
    ];

    for (const { test, fn, plataforma } of handlers) {
      if (link.includes(test)) {
        try {
          resultado = await fn(page, link);
        } catch {
          resultado = { plataforma, canal: '-', viewers: 0 };
        }
        break;
      }
    }

    if (!resultado) {
      resultado = { plataforma: 'Desconhecida', canal: '-', viewers: 0 };
    }

    resultados.push({ ...resultado, link });
    await page.close();
    
  }

  await browser.close();

  res.json({ resultados });
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