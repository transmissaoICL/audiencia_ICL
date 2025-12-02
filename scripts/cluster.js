const puppeteer = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');
const { rasparYouTube } = require('./scrapers/rasparYouTube');
const { rasparFacebook } = require('./scrapers/rasparFacebook');
const { rasparInstagram } = require('./scrapers/rasparInstagram');

let clusterInstance = null;

async function getCluster(){
    if (clusterInstance){
        return clusterInstance;
    }

    console.log('Iniciando Cluser...');

    clusterInstance = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,  // ou BROWSER para isolamento total
        maxConcurrency: 2,
        puppeteerOptions: {
        headless: false,
        userDataDir: './tmp/session',
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox', '--window-position=-32000,-32000',],
        },
    });

    await clusterInstance.task(async ({ page, data: { link } }) => {
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
