const account = {
  username: "celioglicerio",
  password: "ICL@audiencia123456"
}

const instaElements = {
  aria_label: 'Ícone do Contador de visualizadores',
  ao_vivo: 'AO VIVO',
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

    await sleep(3000);

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

module.exports = { rasparInstagram };