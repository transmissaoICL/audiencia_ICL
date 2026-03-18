async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        viewers = parseInt(audiencia.split(" ")[0].replace(/\D/g, ""));
      }
      } catch (err){
        console.warn(`Falha ao pegar audiencia: ${err.message}`);
      }

    } catch (err) {
      console.warn(`Falha ao acessar YouTube: ${err.message}`);
    }
    return { plataforma: 'YouTube', canal, viewers, link };  
  }

  module.exports = { rasparYouTube };