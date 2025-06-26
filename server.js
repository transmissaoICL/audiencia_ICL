const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

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

app.post('/api/raspar', async (req, res) => {
  let { links } = req.body;
  let resultados = [];

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (let link of links) {
    let page = await browser.newPage();
    let resultado;

    const handlers = [
      { test: 'youtube.com', fn: rasparYouTube, plataforma: 'YouTube' },
      { test: 'facebook.com', fn: rasparFacebook, plataforma: 'Facebook' },
      { test: 'twitch.tv', fn: rasparTwitch, plataforma: 'Twitch' },
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