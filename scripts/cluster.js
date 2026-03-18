const puppeteer = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');
const { rasparYouTube } = require('./scrapers/rasparYouTube');
const { rasparFacebook } = require('./scrapers/rasparFacebook');
const { rasparInstagram } = require('./scrapers/rasparInstagram');

let clusterInstance = null;

let DOCKER_SESSION = process.env.DOCKER_SESSION;

async function getCluster(){
    if (clusterInstance){
        return clusterInstance;
    }

    console.log('Iniciando Cluser...');

    clusterInstance = await Cluster.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        concurrency: Cluster.CONCURRENCY_PAGE,  // ou BROWSER para isolamento total
        maxConcurrency: 4,
        timeout: 60000,
        puppeteerOptions: {
        headless: true,
        userDataDir: DOCKER_SESSION || './tmp/session',
        args: ['--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--lang=pt-BR,pt'],
        },
    });

    await clusterInstance.task(async ({ page, data: { link } }) => {

        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);
        
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

        return resultado;
    });
    
    return clusterInstance;
}


module.exports = { getCluster };
