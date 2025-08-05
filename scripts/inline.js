let historico = [];

//TODO: Organizar o projeto mais modularmente
//TODO: Achar uma forma de pegar a audiencia do Instagram
//TODO: Fazer com que o bot consiga mandar a audiencia no grupo do Zap
//TODO: Fazer o bot uma imagem da audiencia e mandar no grupo do zap

function audienciaTemporal() {
    this.canal = '',
    this.link = '',
    this.plataforma = '',
    this.dadosHistoricos = {}
};


const coresPaleta = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
];

// 🎞️ Setup do Chart.js
const ctx = document.getElementById('graficoAudiencia').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: []
  },
  options: {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Viewers' }
      },
      x: {
        title: { display: true, text: 'Horário' }
      }
    }
  }
});

let scrapping = false;

let teste = false;

let interval;

const myToggle = document.getElementById('myToggle');
myToggle.addEventListener('change', function() {
    scrapping = !scrapping;
    if (scrapping){
      interval = setInterval(() => {
        consultarAudiencias();
      }, 180000);
      console.log('Server ligado. Aguardando Scrapping');
    }
    else {
      clearInterval(interval);
      console.log('Server desligado');
    }
});

const testeToggle = document.getElementById('testToggle');
testeToggle.addEventListener('change', function(){
  teste = !teste;
})

const programaDropdown = document.getElementById('programaDropdown');
let programa = Number(programaDropdown.value);
programaDropdown.addEventListener('change', function() {
  programa = Number(programaDropdown.value);
})


function atualizarGraficoAudiencia(historico) {
  if (historico.length === 0) return;

  const timestamps = Object.keys(historico[0].dadosHistoricos);
  chart.data.labels = timestamps;

  chart.data.datasets = historico.map((canal, index) => {
    const dataPoints = timestamps.map(t => canal.dadosHistoricos[t] || 0);
    return {
      label: `${canal.canal} (${canal.plataforma})`,
      data: dataPoints,
      borderWidth: 2,
      fill: false,
      tension: 0.2,
      borderColor: coresPaleta[index % coresPaleta.length]
    };
  });

  chart.update();
}

//ATUALIZA TABELA DE ACORDO COM OS DADOS HISTORICOS
function atualizaTabela(data, programa){

    let timestamp = new Date();
    let textareaICL = document.getElementById("urlsICL");
    let canaisICL = textareaICL.value.trim().split("\n").filter(Boolean);
    let tbody = document.getElementById('tabelaBody');
    tbody.innerHTML = `
        <tr style="background-color: #0056b3;">
        <th style="color: #f0f0f0;"></th>
        <th id="date" style="color: #f0f0f0;"></th>
        <th id="time" style="color: #f0f0f0;"></th>
        </tr>
        <tr style="background-color: #0056b3;">
        <th style="color: #f0f0f0;">#</th>
        <th style="color: #f0f0f0;">Canal</th>
        <th style="color: #f0f0f0;">Audiencia</th>
        </tr>`;
    let totalICL = 0;
    let listaDesordenada = [];

    document.getElementById("date").innerHTML = ` Dia ${timestamp.getDate()}/${timestamp.getMonth() + 1}/${timestamp.getFullYear()}`;
    document.getElementById("time").innerHTML = `Atualizado em: ${timestamp.toLocaleTimeString()}`;
    
    //ITERA SOBRE OS DADOS
    for (let res of data){

        //VE SE OS DADOS SÃO DO CANAL DO UCL
        let encontrado = canaisICL.find(a => a === res.link);

        //SE SIM, ELE CONTABILIZA O TOTAL
        if (encontrado){
            let lastKeyICL = Object.keys(res.dadosHistoricos).at(-1);
            totalICL += res.dadosHistoricos[lastKeyICL];
        }
        //CASO NÃO, ELE ADICIONA AUTOMATICAMENTE EM UMA LISTA DESORDENADA PARA SER ORDENADA E COLOCADO NA TABELA FUTURAMENTE
        else {
            let lastKeyConcorrencia = Object.keys(res.dadosHistoricos).at(-1);
            if (res.dadosHistoricos[lastKeyConcorrencia] != 0){
              listaDesordenada.push([res.canal, res.dadosHistoricos[lastKeyConcorrencia]]);
            }
        }
    }

    //TODO: Atualiza o nome na Tabela para o programa que está no ar no momento
    //COLOCA O VALOR DO ICL, ORDENA A LISTA E CRIA OS ITENS DA CABELA
    listaDesordenada.push([programa, totalICL]);
    listaDesordenada.sort((a, b) => b[1] - a[1]);

    for (let entrie of listaDesordenada){
        let linha = document.createElement('tr');
        let numberAudiencia = entrie[1].toLocaleString('de-DE');
        linha.innerHTML = `
        <td class="cell-concorrencia" >${listaDesordenada.indexOf(entrie) + 1}</td>
        <td class="cell-concorrencia">${entrie[0]}</td>
        <td class="cell-concorrencia">${numberAudiencia}</td>`
        ;
        tbody.appendChild(linha);
    }

}

function adicionarLinhaManual() {
    const tbody = document.getElementById("auto");
    const linha = document.createElement("tr");
    linha.innerHTML = `
        <td><input type="text" placeholder="Plataforma"></td>
        <td><input type="text" placeholder="Nome do Canal"></td>
        <td><input type="number" value="0" min="0" oninput="atualizarTotal()"></td>
        <td><button class='remove-btn' onclick='this.closest("tr").remove(); atualizarTotal();'>X</button></td>
    `;
    tbody.appendChild(linha);
}

function atualizarTotal(data) {

    var novoCanal;
    let timestamp = new Date().toLocaleTimeString();

    //ITERA OS ITEMS DOS RESULTADOS
    for (let res of data.resultados){
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
}

async function consultarAudiencias() {

    let textareaConcorrencia = document.getElementById("urlsConcorrencia");
    let textareaICL = document.getElementById("urlsICL");

    let linksConcorrencia = textareaConcorrencia.value.trim().split("\n").filter(Boolean);
    let linksICL = textareaICL.value.trim().split("\n").filter(Boolean);

    let links = [...linksConcorrencia, ...linksICL];
    let total = 0;
    let detalhesHtml = "";

    let nomePrograma = '';

    if (programa === 13){
      nomePrograma = document.getElementById('nomePrograma').value;
    }

    let resposta = await fetch("http://localhost:3000/api/raspar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links, linksICL, programa, nomePrograma, teste })
    });

    const data = await resposta.json();
    for (let i = 0; i < data.historico.length; i++) {
        const res = data.historico[i];
        const plataforma = res.plataforma;
        const canal = res.canal;
        let lastKeyConcorrencia = Object.keys(res.dadosHistoricos).at(-1);
        const viewers = res.dadosHistoricos[lastKeyConcorrencia];

        detalhesHtml += `<tr class=audiencia-line>
        <td class=audiencia-cell>${plataforma}</td>
        <td>${canal}</td>
        <td>${viewers}</td>
        <td><button class='remove-btn' onclick='this.closest("tr").remove(); atualizarTotal();'>X</button></td>
        </tr>`;

        total += viewers;
    }

    const tbody = document.getElementById("auto");

    // Salva linhas manuais
    const linhasManuais = Array.from(tbody.querySelectorAll("tr"))
        .filter(tr => tr.querySelector("input"));

    // Limpa e atualiza com dados automáticos
    tbody.innerHTML = detalhesHtml;

    // Reanexa linhas manuais
    linhasManuais.forEach(tr => tbody.appendChild(tr));

    atualizarGraficoAudiencia(data.historico);
    atualizaTabela(data.historico, data.programaAtual);
}

