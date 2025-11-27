const periodos = {
  0: 'manha',
  1: 'tarde'
}

const date = new Date();

let periodo = 0;

const periodoToggle = document.getElementById('progPeriodo');
periodoToggle.addEventListener('change', function(){
  if (periodo == 0){
    periodo = 1;
  }
  else { periodo = 0; }
})

const coresPaleta = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
];

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

async function fetchJSONData() {
  const date = new Date(); // Data atualizada no momento da chamada
  
  // Tratamento para meses/dias menores que 10 (ex: 05 em vez de 5) se suas pastas usam zero à esquerda
  // Se suas pastas são "2025/5/1", pode remover o .padStart
  const year = date.getFullYear();
  const month = date.getMonth() + 1; 
  const day = date.getDate();
  const dateStr = date.toISOString().split('T')[0];

  const url = `../data/historicos/${year}/${month}/${day}/audiencia-${dateStr}-${periodos[periodo]}.json`;

  try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json(); // Retorna o objeto JSON pronto
  } catch (error) {
      console.error('Falha ao buscar JSON:', error);
      return null; // Retorna nulo em caso de erro para não quebrar o resto
  }
}

async function atualizarGraficoAudiencia() {

  let historico = await fetchJSONData();

  let historicoCanais = historico.audienciasCanais;
  let historicoProgramas = historico.audienciasProgramas;

  let timestampsDisponiveis = Object.keys(historicoCanais[0].dadosHistoricos);
  timestampsDisponiveis.sort();
  chart.data.labels = timestampsDisponiveis;


  let historicoTotal = [...historicoCanais, ...historicoProgramas];

  chart.data.datasets = historicoTotal.map((canal, index) => {
    console.log(canal);
    const dataPoints = timestampsDisponiveis.map(t => canal.dadosHistoricos[t] || 0);
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
};

let interval = setInterval(() => {
    atualizarGraficoAudiencia(); 
  }, 240000)

atualizarGraficoAudiencia();
