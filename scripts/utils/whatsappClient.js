// scripts/whatsappClient.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { whatsappConst } = require('../../data/constants');

let client = null;
let isReady = false;

const sessionPath = process.env.SESSION_PATH || './.wwebjs_auth_local';

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

async function sendWhatsapp(data, linksICL, programaICL, teste, webnario) {
    
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

    if (teste == false && webnario == true){
      await sendToGroup(whatsappConst['grupoWebnario'], mensagem);
    }
}

function startWhatsApp() {
    console.log('Iniciando cliente WhatsApp...');

    client = new Client({
        authStrategy: new LocalAuth({
        dataPath: sessionPath
        }), // Salva a sessão para não pedir QR Code sempre
        puppeteer: {
            headless: true, // Roda sem abrir janela
            args: ['--no-sandbox', '--disable-setuid-sandbox',]
        },
        webVersionCache: {
            type: 'remote',
            remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/refs/heads/main/html/2.3000.1031490220-alpha.html`,    
        },
    });

    // Gera o QR Code no terminal na primeira vez
    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.generate(qr, { small: true });
        console.log('Por favor, escaneie o QR Code acima com seu WhatsApp.');
    });

    client.on('ready', () => {
        console.log('WhatsApp Client is ready!');
        isReady = true;
        // Opcional: Listar grupos para você descobrir os IDs
        // listGroups(); 
    });

    client.on('auth_failure', msg => {
        console.error('Falha na autenticação do WhatsApp', msg);
    });

    client.initialize();
}

// Função auxiliar para descobrir IDs dos grupos (útil para configurar suas constantes)
async function listGroups() {
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);
    console.log('--- LISTA DE GRUPOS ---');
    groups.forEach(group => {
        console.log(`Nome: ${group.name} | ID: ${group.id._serialized}`);
    });
    console.log('-----------------------');
}

/**
 * Envia mensagem para um grupo buscando pelo Nome ou ID
 * @param {string} groupIdentifier - Nome exato do grupo ou o ID (ex: 12345@g.us)
 * @param {string} message - Texto da mensagem
 */
async function sendToGroup(groupIdentifier, message) {
    if (!isReady) {
        console.warn('WhatsApp ainda não está pronto. Mensagem ignorada.');
        return;
    }

    try {
        let chatId = groupIdentifier;

        // Se não parece um ID (não termina em @g.us), tentamos achar pelo nome
        if (!groupIdentifier.includes('@g.us')) {
            const chats = await client.getChats();
            const group = chats.find(chat => chat.isGroup && chat.name === groupIdentifier);
            
            if (!group) {
                console.error(`Grupo "${groupIdentifier}" não encontrado.`);
                return;
            }
            chatId = group.id._serialized;
        }

        await client.sendMessage(chatId, message, {sendSeen: false});
        console.log(`Mensagem enviada para ${groupIdentifier}`);

    } catch (error) {
        console.error('Erro ao enviar mensagem WhatsApp:', error);
    }
}

module.exports = { startWhatsApp, sendWhatsapp };