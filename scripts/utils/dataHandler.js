const { programas, whatsappConst, periodos } = require('../../data/constants')

function historicoObj() {
    this.resultados = []
}

function audienciaTemporal() {
    this.canal = '',
    this.link = '',
    this.plataforma = '',
    this.dadosHistoricos = {}
};

function audienciaPrograma() {
    this.programa = '',
    this.index = Number,
    this.dadosHistoricos = {}
}

function audienciaCompleta() {
    this.year = 0,
    this.month = 0,
    this.day = 0,
    this.audienciasCanais = [],
    this.audienciasProgramas = []
}


function addHistorico(historico, data, time){
    var novoCanal;

    //ITERA OS ITEMS DOS RESULTADOS
    for (let res of data){
        //CHECA SE EXISTE UM RESULTADO JA NA LISTA HISTORICA
        let encontrado = historico.find(h => h.link === res.link);

        //CASO NÃO ENCONTRE ELE ADICIONA UM NOVO OBJETO
        if (!encontrado){
            novoCanal = new audienciaTemporal();
            novoCanal.canal = res.canal;
            novoCanal.link = res.link;
            novoCanal.plataforma = res.plataforma;
            novoCanal.dadosHistoricos[time] = res.viewers;
            historico.push(novoCanal);
        }

        else if (encontrado && res.canal !== encontrado.canal){
          encontrado.link = res.link;
          encontrado.dadosHistoricos[time] = res.viewers;
        }

        //CASO ELE ENCONTRE ELE ATUALIZA O TIMESTAMP
        else {
            encontrado.dadosHistoricos[time] = res.viewers;
        }
    }

    return historico;
}
    
function addHistoricoPrograma(data, historicoICL, programa, time, canaisICL, programaAtual){
    var novoPrograma;
               
    let apenasICL = []
    for (canal of canaisICL){
        let encontrado = data.find(h => h.link === canal)
        if (encontrado){
            apenasICL.push(encontrado);
        }
    }

    let total = 0;

    for (canal of apenasICL){
        total += Object.values(canal.dadosHistoricos).at(-1);
    }

    if (historicoICL.length != 0){
        let lastHistoricoICL = historicoICL[historicoICL.length - 1];
        if (lastHistoricoICL.index == programa){
            lastHistoricoICL.dadosHistoricos[time] = total;
        }

        else{
            novoPrograma = new audienciaPrograma();
            novoPrograma.index = programa;
            novoPrograma.programa = programaAtual;
            novoPrograma.dadosHistoricos[time] = total;
            historicoICL.push(novoPrograma);
        }
    }

    else{
        novoPrograma = new audienciaPrograma();
        novoPrograma.programa = programaAtual;
        novoPrograma.index = programa;
        novoPrograma.dadosHistoricos[time] = total;
        historicoICL.push(novoPrograma);
    }
    return historicoICL;
}

function saveJSON(data, dataICL, periodo){
    console.log('Salvando audiencia...')
    const date = new Date();
    let completo = new audienciaCompleta();
    completo.audienciasCanais = [...data.resultados];
    completo.audienciasProgramas = dataICL;
    completo.year = date.getFullYear();
    completo.month = date.getMonth();
    completo.day = date.getDate();
    //const dir = date.getMonth().toString()
    const fs = require('fs');
    const path = require('path');

    let yearFolder = completo.year;
    let monthFolder = completo.month + 1;
    let dayFolder = completo.day;

    let periodoAtual = periodos[periodo];
    const jsonString = JSON.stringify(completo, null, 2);

    if (fs.existsSync(`./data/historicos/${yearFolder}`)){
        if(fs.existsSync(`./data/historicos/${yearFolder}/${monthFolder}`)){
            if (fs.existsSync(`./data/historicos/${yearFolder}/${monthFolder}/${dayFolder}`)){
                fs.writeFileSync(`./data/historicos/${yearFolder}/${monthFolder}/${dayFolder}/audiencia-${date.toISOString().split('T')[0]}-${periodoAtual}.json`, jsonString);
                return
            }
            fs.mkdirSync(`./data/historicos/${yearFolder}/${monthFolder}/${dayFolder}`);
        }
        fs.mkdirSync(`./data/historicos/${yearFolder}/${monthFolder}`);
        fs.mkdirSync(`./data/historicos/${yearFolder}/${monthFolder}/${dayFolder}`);
    }

    else {
        fs.mkdirSync(`./data/historicos/${yearFolder}`);
        fs.mkdirSync(`./data/historicos/${yearFolder}/${monthFolder}`);
        fs.mkdirSync(`./data/historicos/${yearFolder}/${monthFolder}/${dayFolder}`);
    }
    fs.writeFileSync(`./data/historicos/${yearFolder}/${completo.month}/${dayFolder}/audiencia-${date.toISOString().split('T')[0]}-${periodoAtual}.json`, jsonString);

  

    //const dirPath = path.join('.data/historicos', dir);
    //const filePath = path.join(dir, `audiencia-${date.toISOString().split('T')[0]}.json`);

    // const jsonString = JSON.stringify(completo, null, 2);
    fs.writeFileSync(`./data/historicos/${yearFolder}/${monthFolder}/${dayFolder}/audiencia-${date.toISOString().split('T')[0]}-${periodoAtual}.json`, jsonString);
    console.log("Arquivo se audiência salvo.");
}



module.exports = { addHistorico, saveJSON, addHistoricoPrograma, historicoObj };