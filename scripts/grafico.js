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

async function atualizarGraficoAudiencia() {

  let resposta = await fetch("/api/grafico", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  const data = resposta.json();
  let historicoTotal = data.historicoTotal;

  chart.data.datasets = historicoTotal.map((canal, index) => {
    const dataPoints = timestampsDisponiveis.map(t => canal.dadosHistoricos[t] || 0);
    return {
    label: `${ canal.canal || canal.programa } (${ canal.plataforma || '' })`,
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
