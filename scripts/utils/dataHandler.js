function audienciaTemporal() {
    this.canal = '',
    this.link = '',
    this.plataforma = '',
    this.dadosHistoricos = {}
};

function audienciaPrograma() {
    this.programa = '',
    this.dadosHistoricos = {}
}

function audienciaCompleta() {
    this.year = 0,
    this.month = 0,
    this.day = 0,
    this.audiencias = []
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

function addHistoricoPrograma(data, historicoICL, programa, time){
    var novoPrograma;

    if (historicoICL.length != 0){
        for (let prog of historicoICL){
            if (prog.programa === programa){
                if (Object.keys(prog.dadosHistoricos).at(-1) === time){
                    prog.dadosHistoricos[time] += data.viewers;
                }
                else{
                    prog.dadosHistoricos[time] = data.viewers;
                }
            }

            else{
                novoPrograma = new audienciaPrograma();
                novoPrograma.programa = programa;
                novoPrograma.dadosHistoricos[time] = data.viewers;
                historicoICL.push(novoPrograma);
            }
        }
    }
    else{
        novoPrograma = new audienciaPrograma();
        novoPrograma.programa = programa;
        novoPrograma.dadosHistoricos[time] = data.viewers;
        historicoICL.push(novoPrograma);
    }
    return historicoICL;
}

function saveJSON(data){
    console.log('Salvando audiencia...')
    const date = new Date();
    let completo = new audienciaCompleta();
    completo.audiencias = data;
    completo.year = date.getFullYear();
    completo.month = date.getMonth();
    completo.day = date.getDate();
    const fs = require('fs');
    const jsonString = JSON.stringify(completo, null, 2);
    fs.writeFileSync(`./data/historicos/audiencia-${date.toISOString().split('T')[0]}.json`, jsonString);
    console.log("Arquivo se audiência salvo.");
}



module.exports = { addHistorico, saveJSON, addHistoricoPrograma };