const socket = io({
    transports: ['websocket'], // 🚀 FORÇA APENAS WEBSOCKET
    upgrade: false             // Impede a tentativa de "subida" de polling para ws
});

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Sistema Iniciado. Verificando integridade...");
    
    // 1. Verificação de IDs básicos
    const IDsNecessarios = ['myToggle', 'programaDropdown', 'urlsConcorrencia', 'urlsICL'];
    IDsNecessarios.forEach(id => {
        if (!document.getElementById(id)) console.warn(`⚠️ Elemento "${id}" ausente!`);
    });

    // 2. Carrega o tema salvo
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 3. Inicializa as abas
    const defaultTab = document.getElementById("defaultOpen");
    if (defaultTab) defaultTab.click();

    // 4. Carrega o menu de sessoes anteriores
    await carregarMenuRecuperacao();

    // 5. O MAIS IMPORTANTE: Recupera a identidade e os links
    await recuperarIdentidade();
});

let CURRENT_SESSION_ID = null;

// Escutando a atualização em tempo real
try{
  socket.on('audiencia_atualizada', (data) => {
  console.log("⚡ [Socket] Dados recebidos em tempo real!");

  // 1. Atualiza o Gráfico (Usando sua função existente)
  if (data.historicoModular && data.historicoModular.resultados) {
      atualizarGraficoAudiencia(data.historicoModular.resultados);
      
      // 2. Atualiza a Tabela (Usando sua função existente)
      atualizaTabela(data.historicoModular.resultados, data.programaAtual);
      
      // 3. Mostra o alerta (Para quem não está fazendo o scrap saber que mudou)
      alertMessageDisplay("Audiência Atualizada via Bot", "success");
    }
  });
}

catch(err){}

async function carregarMenuRecuperacao() {
    const select = document.getElementById('selectSessoesAnteriores');
    try {
        const res = await fetch('/api/sessoes/recentes');
        const sessoes = await res.json();
        
        // Mantém apenas a primeira opção
        select.innerHTML = '<option value="">-- Retomar Sessão --</option>';
        
        sessoes.forEach(s => {
            const dataFormatada = new Date(s.criado_em).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.innerHTML = `${dataFormatada} | ${s.tipo.toUpperCase()}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao carregar histórico:", e);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

carregarMenuRecuperacao();

async function recuperarSessaoSelecionada(id) {
  if (!id) return;
  if (confirm(`Deseja carregar os dados da sessão ${id} e continuar nela?`)) {
      // O redirecionamento fará a página recarregar e o 'recuperarIdentidade' cuidará do resto
      window.location.href = `?session=${id}`;
  }
}


// Logica de Identidade da Sessão
function gerarNovoID(){
  const agora = new Date();
  const ts = agora.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).substring(7);
  return `SES-${ts}-${rand}`;
}

//TODO: Fazer o bot uma imagem da audiencia e mandar no grupo do zap

const coresPaleta = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
];

// Template da linha de link (ID e classes mantidos para seu scraper)
const newLineInnerText = `
    <input class="linkName" placeholder="Nome do Canal" style="width: 15%;">
    <input class="linkPlataforma" placeholder="Plataforma do Canal" style="width: 15%;">
    <input class="link" placeholder="Link" style="width: 50%;" onchange="autoComplete(this)">
    <input class="customCheck" type="checkbox" style="height: 15px; width: 45px">
    <span class="closeLinkBtn" onclick="excludeLink(this)">&times;</span>
`;

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

// Variável para manter o estado dos dados da tabela de ranking
let rankingState = [];

let scrapping = false;

let teste = false;

let interval;

let programacao = false;

let webnario = false;

let periodo = 0;

const programaDropdown = document.getElementById('programaDropdown');
let programa = Number(programaDropdown.value);

function alertMessageHide(){
  alertMessage.style.display = "none";
}

function alertMessageDisplay(message, alertType){
  alertMessage.className = `alertmessage ${alertType}`;
  alertMessage.innerText = message;
  alertMessage.appendChild(alertCloseBtn);
  alertMessage.style.display = "block";
}

// 1. Alternador de Tema
const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  themeBtn.innerHTML = newTheme === 'light' ? '<i class="fa-solid fa-moon"></i> Modo Escuro' : '<i class="fa-solid fa-sun"></i> Modo Claro';
});

// 2. Observador para o Som da Alerta
const alertBox = document.getElementById('alertMessage');
const audio = document.getElementById('notificationSound');

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'style') {
      audio.play().catch(e => console.log("Som bloqueado pelo navegador até interação do usuário."));
    }
  });
});
observer.observe(alertBox, { attributes: true });

const webnarioToggle = document.getElementById('webnarioToggle');
webnarioToggle.addEventListener('change', function(){
  webnario = this.checked;
  
})

let printToggle = false;
const printAutomatico = document.getElementById('printToggle');
printAutomatico.addEventListener('change', function(){
  printToggle = this.checked;
})

const progToggle = document.getElementById('progToggle');
progToggle.addEventListener('change', function(){
  programacao = this.checked;
});

const myToggle = document.getElementById('myToggle');
myToggle.addEventListener('change', async function() {
    scrapping = this.checked; // Usando this.checked para ser mais preciso
    
    if (scrapping){
      // Se não temos ID, agora sim criamos e salvamos no Postgres
      if (!CURRENT_SESSION_ID){
        CURRENT_SESSION_ID = gerarNovoID();
        console.log("Gerando novo ID e registrando no banco...");
        
        try {
          const response = await fetch("/api/sessoes/iniciar", {
            method: 'POST',
            headers: { 'Content-Type':  'application/json'},
            body: JSON.stringify({ sessionID: CURRENT_SESSION_ID, tipo: programacao, webnario: webnario })
          });
          
          if (response.ok) {
            console.log("Sessão salva no banco com sucesso!");
            // Atualiza a URL sem recarregar a página toda
            window.history.pushState({}, '', `?session=${CURRENT_SESSION_ID}`);
          }
        } catch (err) {
          console.error("Falha ao comunicar com o servidor:", err);
        }
      }
      
      interval = setInterval(() => {
        consultarAudiencias();
      }, 240000);
      consultarAudiencias();
    } else {
      alertMessageDisplay("Bot Pausado", "alert");
      clearInterval(interval);
    }
});

const testeToggle = document.getElementById('testeToggle');
testeToggle.addEventListener('change', function(){
  teste = this.checked;
})

programaDropdown.addEventListener('change', function() {
  programa = Number(programaDropdown.value);
})

function autoComplete(element){
  if (element.value.includes(' ')){
    let links = (element.value.split(" "));
    let newLine;
    element.value = links.shift();
    for (let link of links){
      if (element.classList.contains("linkConcorrencia")){
        newLine = addLink(element);
        let linkInput = newLine.getElementsByClassName("link")[0];
        linkInput.value = link;
        linkInput.classList.add("linkConcorrencia")
      }
      else {
        newLine = addLink(element);
        let linkInput = newLine.getElementsByClassName("link")[0];
        linkInput.value = link;
        linkInput.classList.add("linkICL")
      }
    }
  }
}

// --- FUNÇÕES ORIGINAIS MANTIDAS E MELHORADAS ---

function addLinkLine(element, specificClass) {
  let newLine = document.createElement("div");
  newLine.classList.add("linkLine", "animate-fade"); // Adiciona a animação de entrada
  newLine.innerHTML = newLineInnerText;
  
  // Adiciona a classe específica (linkConcorrencia ou linkICL) ao input correto
  const linkInput = newLine.querySelector('.link');
  if (linkInput && specificClass) {
    linkInput.classList.add(specificClass);
  }
  
  element.appendChild(newLine);
  return newLine;
}

function addLink(element) {
  // Verifica qual botão foi pressionado para saber qual lista atualizar
  if (element.classList.contains("linkConcorrencia")) {
    let concorrencia = document.getElementById("urlsConcorrencia");
    return addLinkLine(concorrencia, "linkConcorrencia");
  } else {
    let icl = document.getElementById("urlsICL");
    return addLinkLine(icl, "linkICL");
  }
}

function excludeLink(element) {
  let parent = element.parentNode;
  // Adiciona animação de saída antes de remover
  parent.classList.add("animate-fade-out");
  
  // Espera a animação terminar (300ms) para remover do DOM
  setTimeout(() => {
    parent.remove();
  }, 300);
}

async function carregarHistoricoInicial(sessionID) {

    const response = await fetch(`/api/sessoes/historico/${sessionID}`);
    const dados = await response.json();
    console.log(dados);
    if (dados) {
        atualizarGraficoAudiencia(dados);
        atualizaTabela(dados, "Carregando...");
    }
}

async function recuperarIdentidade() {
    const urlParams = new URLSearchParams(window.location.search);
    const idURL = urlParams.get('session');

    if (idURL) {
        CURRENT_SESSION_ID = idURL;
        console.log("📜 Sessão detectada na URL:", CURRENT_SESSION_ID);
        socket.emit('join_session', CURRENT_SESSION_ID);
        
        try {
            const response = await fetch('/api/sessoes/loadSessao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionID: idURL })
            });

            if (!response.ok) {
                throw new Error(`Erro no servidor: ${response.status}`);
            }

            const detalhes = await response.json();
            
            // LOG VITAL: Verifique no F12 se este log aparece e o que tem dentro dele
            console.log("📦 Dados recebidos do banco:", detalhes);

            if (detalhes && detalhes.length > 0) {
                preencherInterfaceComLinks(detalhes);
            } else {
                console.warn("⚠️ A sessão foi encontrada, mas o banco retornou zero links.");
            }

            carregarHistoricoInicial(idURL);

        } catch (err) {
            console.error("❌ Erro fatal ao carregar dados:", err);
        }
    }
}

function preencherInterfaceComLinks(detalhes) {
    const urlsConcorrencia = document.getElementById("urlsConcorrencia");
    const urlsICL = document.getElementById("urlsICL");

    if (!urlsConcorrencia || !urlsICL) return;

    // Limpa os placeholders iniciais
    urlsConcorrencia.replaceChildren();
    urlsICL.replaceChildren();

    detalhes.forEach(d => {
        // CUIDADO: Verifique se o banco retorna 'link_icl' como booleano ou string
        const isICL = (d.link_icl === true || d.link_icl === 'true');
        const container = isICL ? urlsICL : urlsConcorrencia;
        const classeCSS = isICL ? "linkICL" : "linkConcorrencia";

        // Chama sua função original
        const newLine = addLinkLine(container, classeCSS);

        if (newLine) {
            // MAPEAMENTO CRÍTICO: 
            // Verifique se os nomes das colunas no banco são EXATAMENTE esses:
            newLine.querySelector(".linkName").value = d.canal_nome || "";
            newLine.querySelector(".linkPlataforma").value = d.plataforma || "";
            newLine.querySelector(".link").value = d.link_url || "";
            
            console.log(`✅ Preenchido: ${d.canal_nome}`);
        }
    });
}

// --- NOVAS FUNCIONALIDADES (TEMA E SOM) ---

// 1. Alternador de Tema (Modo Claro/Escuro)
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', newTheme);
  
  // Salva a preferência do usuário
  localStorage.setItem('theme', newTheme);
}

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

if (alertBox) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Se o estilo mudar e o display não for 'none', toca o som
      if (mutation.attributeName === 'style' && alertBox.style.display !== 'none') {
        notificationSound.play().catch(e => console.log("Áudio aguardando interação inicial."));
      }
    });
  });
  observer.observe(alertBox, { attributes: true });
}

// 3. Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Carrega o tema salvo
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
});

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

function atualizarGraficoAudiencia(historico) {
  if (!historico || historico.length === 0) return;

  // 1. Capturar todos os timestamps (labels) que chegaram
  const novosTimestamps = Object.keys(historico[0].dadosHistoricos);

  // 2. Mesclar com os labels que já existem no gráfico (sem duplicar)
  novosTimestamps.forEach(t => {
    if (!chart.data.labels.includes(t)) {
      chart.data.labels.push(t);
    }
  });

  // Ordenar os labels para garantir que o gráfico siga a linha do tempo
  chart.data.labels.sort();

  // 3. Atualizar ou Criar os Datasets
  historico.forEach((canalChegando, index) => {
    // Procura se esse canal já existe no gráfico
    let dataset = chart.data.datasets.find(ds => 
      ds.label === `${canalChegando.canal} (${canalChegando.plataforma})`
    );

    // Se o canal não existe (ex: um novo concorrente entrou no meio da live), cria ele
    if (!dataset) {
      dataset = {
        label: `${canalChegando.canal} (${canalChegando.plataforma})`,
        data: new Array(chart.data.labels.length - 1).fill(0), // Preenche o passado com zero
        borderWidth: 2,
        fill: false,
        tension: 0.2,
        borderColor: coresPaleta[chart.data.datasets.length % coresPaleta.length]
      };
      chart.data.datasets.push(dataset);
    }

    // 4. Mapear os dados para a posição correta dos labels
    // Isso garante que o ponto 14:00 vá para a coluna 14:00, mesmo que chegue atrasado
    dataset.data = chart.data.labels.map(t => {
      // Se temos o dado no histórico que chegou agora, usamos ele
      if (canalChegando.dadosHistoricos[t] !== undefined) {
        return canalChegando.dadosHistoricos[t];
      }
      // Se não temos no que chegou, mas já tínhamos no gráfico antes, mantemos o valor
      const idxAntigo = chart.data.labels.indexOf(t);
      return dataset.data[idxAntigo] !== undefined ? dataset.data[idxAntigo] : 0;
    });
  });

  // 5. Renderizar a mudança
  chart.update('none'); // 'none' evita animações bruscas em cada ponto novo
}

async function executarPesquisa() {
    const loader = document.getElementById('resultadoPesquisa');
    loader.style.display = 'block';
    loader.innerHTML = '<p class="placeholder">Processando dados históricos...</p>';

    const payload = {
        sessionID: CURRENT_SESSION_ID,
        programa: document.getElementById('filtroPrograma').value,
        dataInicio: document.getElementById('dataInicio').value,
        dataFim: document.getElementById('dataFim').value,
        horaInicio: document.getElementById('horaInicio').value,
        horaFim: document.getElementById('horaFim').value,
        intervalo: document.getElementById('intervaloDados').value,
        canais: document.getElementById('filtroCanais').value,
        consolidarICL: document.getElementById('consolidarICL').checked
    };

    const response = await fetch('/api/pesquisa-avancada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const dados = await response.json();
    renderizarTabelaPesquisa(dados);
}

function renderizarTabelaPesquisa(dados) {
  const container = document.getElementById('resultadoPesquisa');
  if (dados.length === 0) {
      container.innerHTML = '<p class="placeholder">Nenhum dado encontrado para este filtro.</p>';
      return;
  }

  let tableHtml = `
      <table class="modern-table">
          <thead>
              <tr>
                  <th>Horário</th>
                  <th>Canal / Programa</th>
                  <th>Média Audiência</th>
                  <th>Pico</th>
              </tr>
          </thead>
          <tbody>
              ${dados.map(d => `
                  <tr>
                      <td>${d.momento}</td>
                      <td><b>${d.canal}</b></td>
                      <td>${parseInt(d.media_audiencia).toLocaleString()}</td>
                      <td class="text-primary">${parseInt(d.pico_audiencia).toLocaleString()}</td>
                  </tr>
              `).join('')}
          </tbody>
      </table>
  `;
  container.innerHTML = tableHtml;
}

// ATUALIZA O ESTADO DOS DADOS (Não desenha mais direto)
function atualizaTabela(data, programaAtual) {
    let timestamp = new Date();
    
    // Atualiza cabeçalhos de data/hora
    document.getElementById("date").innerHTML = ` Dia ${timestamp.getDate()}/${timestamp.getMonth() + 1}/${timestamp.getFullYear()}`;
    document.getElementById("time").innerHTML = `Atualizado em: ${timestamp.toLocaleTimeString()}`;

    // Captura os canais configurados
    let urlsConcorrencia = document.getElementById("urlsConcorrencia");
    let linesConcorrencia = urlsConcorrencia.getElementsByClassName("linkLine");
    let canaisConcorrencia = Array.from(linesConcorrencia).map(el => el.getElementsByClassName("link")[0].value);

    let urlsICL = document.getElementById("urlsICL");
    let linesICL = urlsICL.getElementsByClassName("linkLine");
    let canaisICL = Array.from(linesICL).map(el => el.getElementsByClassName("link")[0].value);

    let totalICL = 0;
    rankingState = []; // Zera o estado para recálculo

    // Processa os dados da API
    for (let res of data) {
        let lastKey = Object.keys(res.dadosHistoricos).at(-1);
        let valorAtual = res.dadosHistoricos[lastKey] || 0;

        // É canal ICL? Soma no total
        if (canaisICL.includes(res.link)) {
            totalICL += valorAtual;
        } 
        // É concorrência? Adiciona na lista
        else if (canaisConcorrencia.includes(res.link)) {
            if (valorAtual !== 0) { // Opcional: manter ou remover a checagem de zero se quiser editar canais zerados
                rankingState.push({
                    nome: res.canal,
                    audiencia: valorAtual,
                    tipo: 'concorrencia'
                });
            }
        }
    }

    // Adiciona o total do ICL (Programa Atual)
    rankingState.push({
        nome: programaAtual,
        audiencia: totalICL,
        tipo: 'icl' // Flag para identificar se é o nosso canal
    });

    // Chama a renderização
    renderizarTabelaRanking();
}

// FUNÇÃO QUE DESENHA A TABELA BASEADA NO ESTADO ATUAL
function renderizarTabelaRanking() {
    let tbody = document.getElementById('tabelaBody');
    
    // Mantém o cabeçalho fixo e limpa o resto
    // Nota: Idealmente o cabeçalho deveria estar no <thead> no HTML, mas mantendo sua estrutura:
    const headerHTML = `
        <tr class="row-concorrencia row-header" style="background-color: #099ace;">
            <th style="color: #f0f0f0;"></th>
            <th id="date" style="color: #f0f0f0; border: 1px solid black">${document.getElementById("date").innerHTML}</th>
            <th id="time" style="color: #f0f0f0; border: 1px solid black">${document.getElementById("time").innerHTML}</th>
        </tr>
        <tr class="row-concorrencia" style="background-color: #099ace;">
            <th style="color: #f0f0f0; border: 1px solid black">#</th>
            <th style="color: #f0f0f0; border: 1px solid black">Canal</th>
            <th style="color: #f0f0f0; border: 1px solid black">Audiencia</th>
        </tr>`;

    tbody.innerHTML = headerHTML;

    // 1. Reordena o array (Maior para o menor)
    rankingState.sort((a, b) => b.audiencia - a.audiencia);

    // 2. Gera as linhas
    rankingState.forEach((item, index) => {
        let linha = document.createElement('tr');
        
        // Formata número com pontos (Ex: 1.200)
        let valorFormatado = item.audiencia.toLocaleString('de-DE');

        linha.innerHTML = `
            <td class="cell-concorrencia-ranking"><b style="text-align: center">${index + 1}</b></td>
            <td class="cell-concorrencia"><b>${item.nome}</b></td>
            <td class="cell-numero">
                <b><input 
                    type="text" 
                    class="input-audiencia" 
                    value="${valorFormatado}" 
                    onchange="atualizarAudienciaManual(${index}, this.value)"
                    onkeypress="return event.charCode >= 48 && event.charCode <= 57"
                >
            </b></td>
        `;
        tbody.appendChild(linha);
    });
}

// FUNÇÃO CHAMADA QUANDO O USUÁRIO EDITA UM VALOR
function atualizarAudienciaManual(index, novoValor) {
    // Remove pontos ou caracteres não numéricos para salvar no estado como Inteiro
    let valorLimpo = parseInt(novoValor.replace(/\./g, '')) || 0;

    // Atualiza o estado global
    // Nota: O index aqui refere-se à posição no array JÁ ORDENADO. 
    // Como reordenamos a cada edição, isso funciona para o fluxo imediato.
    rankingState[index].audiencia = valorLimpo;

    console.log(`Valor alterado manualmente para ${valorLimpo}. Reordenando...`);

    // Re-renderiza a tabela (isso vai disparar o sort novamente)
    renderizarTabelaRanking();
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
  let canaisConcorrencia = [];
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

  let resposta = await fetch("/api/raspar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionID: CURRENT_SESSION_ID, links, canaisICL, programa, nomePrograma, teste, programacao, periodo, webnario, printToggle})
  });

  const data = await resposta.json();
  historicoModular = data.historicoModular;
  console.log(historicoModular);
  historicoResultados = historicoModular.resultados;

  alertMessageDisplay("Audiência Atualizada", "success");

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

  atualizarGraficoAudiencia(historicoResultados);
  atualizaTabela(historicoResultados, data.programaAtual);
}
