const app = express();

let programacao = false;

const coresPaleta = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
];

const ctx = document.getElementById('graficoAudiencia').getContext('2d');

const progToggle = document.getElementById('progToggle');
progToggle.addEventListener('change', function(){
  programacao = !programacao
})

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
};

