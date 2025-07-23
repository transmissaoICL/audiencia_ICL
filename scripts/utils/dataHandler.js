function audienciaTemporal() {
    this.canal = '',
    this.link = '',
    this.plataforma = '',
    this.dadosHistoricos = {}
};


function addHistorico(data){
    let historico = [];
    var novoCanal;
    let timestamp = new Date().toLocaleTimeString();

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
            novoCanal.dadosHistoricos[timestamp] = res.viewers;
            historico.push(novoCanal);
        }

        else if (encontrado && res.canal !== encontrado.canal){
          encontrado.link = res.link;
          encontrado.dadosHistoricos[timestamp] = res.viewers;
        }

        //CASO ELE ENCONTRE ELE ATUALIZA O TIMESTAMP
        else {
            encontrado.dadosHistoricos[timestamp] = res.viewers;
        }
    }

    return historico;
}

module.exports = { addHistorico };