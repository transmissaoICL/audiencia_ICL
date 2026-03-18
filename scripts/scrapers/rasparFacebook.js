const facebookDict = {
    'eduardomoreirabrasil': "Eduardo Moreira está ao vivo",
    'institutoconhecimentoliberta': "Instituto Conhecimento Liberta está ao vivo",
    'profile.php?id=100083958152654': "ICL Notícias está ao vivo"
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        page.click('div.html-div'),
      ]);
    }

    await sleep(5000);

    await page.goto(link, { waitUntil: 'networkidle2', timeout: 50000 });

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

      await sleep(2000);

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

module.exports = { rasparFacebook };