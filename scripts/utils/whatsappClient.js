// scripts/whatsappClient.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client = null;
let isReady = false;

function startWhatsApp() {
    console.log('Iniciando cliente WhatsApp...');

    client = new Client({
        authStrategy: new LocalAuth(), // Salva a sessão para não pedir QR Code sempre
        puppeteer: {
            headless: true, // Roda sem abrir janela
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
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

        await client.sendMessage(chatId, message);
        console.log(`Mensagem enviada para ${groupIdentifier}`);

    } catch (error) {
        console.error('Erro ao enviar mensagem WhatsApp:', error);
    }
}

module.exports = { startWhatsApp, sendToGroup };