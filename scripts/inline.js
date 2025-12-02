let historicoModular = undefined;

//TODO: Fazer o bot uma imagem da audiencia e mandar no grupo do zap

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

let programacao = false;

let periodo = 0;

const periodoToggle = document.getElementById('periodo');
periodoToggle.addEventListener('change', function(){
  if (periodo == 0){
    periodo = 1;
  }
  else{
    periodo = 0;
  }
})

const progToggle = document.getElementById('progToggle');
progToggle.addEventListener('change', function(){
  programacao = !programacao;
});

const myToggle = document.getElementById('myToggle');
myToggle.addEventListener('change', function() {
    scrapping = !scrapping;
    if (scrapping){
      interval = setInterval(() => {
        consultarAudiencias();
      }, 240000);
      consultarAudiencias();
    }
    else {
      alertMessageDisplay("Bot Pausado", "alert");
      clearInterval(interval);
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

const newLineInnerText = `
<input class="linkName" placeholder="Nome do Canal" style="width: 15%;">
<input class="linkPlataforma" placeholder="Plataforma do Canal" style="width: 15%;">
<input class="link" placeholder="Link" style="width: 50%;" onchange="autoComplete(this)">
<input class="customCheck" type="checkbox" style="height: 15px; width: 45px">
<span class="closeLinkBtn" onclick="excludeLink(this)">&timesb;</span>
`

function autoComplete(element){
  console.log(element);
  if (element.value.includes(' ')){
    let links = (element.value.split(" "));
    let newLine;
    element.value = links.shift();
    for (let link of links){
      if (element.classList.contains("linkConcorrencia")){
        newLine = addLink(element, "linkConcorrencia");
        let linkInput = newLine.getElementsByClassName("link")[0];
        linkInput.value = link;
        linkInput.classList.add("linkConcorrencia")
      }
      else {
        newLine = addLink(element, "linkICL");
        let linkInput = newLine.getElementsByClassName("link")[0];
        linkInput.value = link;
        linkInput.classList.add("linkICL")
      }
    }
  }
}

function addLinkLine(element, className){
  let newLine = document.createElement("div");
  newLine.classList.add("linkLine");
  newLine.innerHTML = newLineInnerText
  element.appendChild(newLine);
  return newLine;
}

function addLink(element){
  // Get which button is pressed to now which link to create
  if (element.classList.contains("linkConcorrencia")){
    let concorrencia = document.getElementById("urlsConcorrencia");
    let newLine = addLinkLine(concorrencia, "linkConcorrencia");
    newLine.getElementsByClassName('link')[0].classList.add('linkConcorrencia');
    return newLine;
  }
  else{
    let icl = document.getElementById("urlsICL");
    let newLine = addLinkLine(icl, "linkICL");
    newLine.getElementsByClassName('link')[0].classList.add('linkICL');
    return newLine;
  }
}

function excludeLink(element){
  let parent = element.parentNode;
  parent.remove();

}

function openPage(pageName, elmnt) {
  // Hide all elements with class="tabcontent" by default */
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Remove the background color of all tablinks/buttons
  tablinks = document.getElementsByClassName("tablink");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.backgroundColor = "";
  }

  elmnt.style.backgroundColor = "#0056b3";
  
  // Show the specific tab content
  document.getElementById(pageName).style.display = "block";
}

// Get the element with id="defaultOpen" and click on it
document.getElementById("defaultOpen").click();

const alertMessage = document.getElementById("alertMessage");
const alertCloseBtn = document.getElementById("closealert");

function alertMessageHide(){
  alertMessage.style.display = "none";
}

function alertMessageDisplay(message, alertType){
  alertMessage.className = `alertmessage ${alertType}`;
  alertMessage.innerText = message;
  alertMessage.appendChild(alertCloseBtn);
  alertMessage.style.display = "block";
}

function atualizarGraficoAudiencia(historico) {
  console.log(historico.length);
  console.log(historico);
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
function atualizaTabela(data, programaAtual){

    let timestamp = new Date();
    let urlsConcorrencia = document.getElementById("urlsConcorrencia");
    let linesConcorrencia = urlsConcorrencia.getElementsByClassName("linkLine");
    let canaisConcorrencia = []
    for (let element of linesConcorrencia){
      let link = element.getElementsByClassName("link")[0].value;
      canaisConcorrencia.push(link);
    }

    let urlsICL = document.getElementById("urlsICL");
    let linesICL = urlsICL.getElementsByClassName("linkLine");
    let canaisICL = [];
    for (let element of linesICL){
      let link = element.getElementsByClassName("link")[0].value;
      canaisICL.push(link);
    }

    let tbody = document.getElementById('tabelaBody');
    tbody.innerHTML = `
        <tr  class="row-concorrencia row-header" style="background-color: #099ace;">
        <th style="color: #f0f0f0;"></th>
        <th id="date" style="color: #f0f0f0; border: 1px solid black"></th>
        <th id="time" style="color: #f0f0f0; border: 1px solid black"></th>
        </tr>
        <tr  class="row-concorrencia" style="background-color: #099ace;">
        <th style="color: #f0f0f0; border: 1px solid black">#</th>
        <th style="color: #f0f0f0; border: 1px solid black">Canal</th>
        <th style="color: #f0f0f0; border: 1px solid black">Audiencia</th>
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
        else if(canaisConcorrencia.find(a => a === res.link)) {
            let lastKeyConcorrencia = Object.keys(res.dadosHistoricos).at(-1);
            if (res.dadosHistoricos[lastKeyConcorrencia] != 0){
              listaDesordenada.push([res.canal, res.dadosHistoricos[lastKeyConcorrencia]]);
            }
        }
    }

    //TODO: Atualiza o nome na Tabela para o programa que está no ar no momento
    //COLOCA O VALOR DO ICL, ORDENA A LISTA E CRIA OS ITENS DA CABELA
    listaDesordenada.push([programaAtual, totalICL]);
    listaDesordenada.sort((a, b) => b[1] - a[1]);

    for (let entrie of listaDesordenada){
        let linha = document.createElement('tr');
        let numberAudiencia = entrie[1].toLocaleString('de-DE');
        linha.innerHTML = `
        <td class="cell-concorrencia-ranking" ><b style: text-align: center>${listaDesordenada.indexOf(entrie) + 1}</b></td>
        <td class="cell-concorrencia">${entrie[0]}</td>
        <td class="cell-numero">${numberAudiencia}</td>`
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

  let urlsConcorrencia = document.getElementById("urlsConcorrencia");
  let linesConcorrencia = urlsConcorrencia.getElementsByClassName("linkLine");
  let canaisConcorrencia = []
  for (let element of linesConcorrencia){
    let link = element.getElementsByClassName("link")[0].value;
    if (link == " " || link == "") continue;
    canaisConcorrencia.push(link);
  }

  let urlsICL = document.getElementById("urlsICL");
  let linesICL = urlsICL.getElementsByClassName("linkLine");
  let canaisICL = [];
  for (let element of linesICL){
    let link = element.getElementsByClassName("link")[0].value;
    canaisICL.push(link);
  }

  let links = [...canaisConcorrencia, ...canaisICL];
  let total = 0;
  let detalhesHtml = "";

  let nomePrograma = '';

  if (programa === 13){
    nomePrograma = document.getElementById('nomePrograma').value;
  }

  alertMessageDisplay("Bot Está Raspando a audiencia", "success");
  let resposta = await fetch("/api/raspar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ links, canaisICL, programa, nomePrograma, teste, historicoModular, programacao, periodo})
  });

  const data = await resposta.json();
  historicoModular = data.historicoModular;
  historicoResultados = historicoModular.resultados;

  for (let i = 0; i < data.historicoModular.resultados.length; i++) {
    resultado = historicoResultados[i];
    const plataforma = resultado.plataforma;
    const canal = resultado.canal;
    let lastKeyConcorrencia = Object.keys(resultado.dadosHistoricos).at(-1);
    const viewers = resultado.dadosHistoricos[lastKeyConcorrencia];

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

  atualizarGraficoAudiencia(historicoResultados);
  atualizaTabela(historicoResultados, data.programaAtual);

  alertMessageDisplay("Audiência Atualizada", "success");
}

