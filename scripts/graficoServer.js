const express = require('express');
const app = express();

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

app.post('/api/grafico', async (req, res) =>{
    let historico = await fetchJSONData();

    let historicoCanais = historico.audienciasCanais;
    let historicoProgramas = historico.audienciasProgramas;

    let timestampsDisponiveis = Object.keys(historicoCanais[0].dadosHistoricos);
    timestampsDisponiveis.sort();
    chart.data.labels = timestampsDisponiveis;


    let historicoTotal = [...historicoCanais, ...historicoProgramas];

    res.json({ historicoTotal });
})

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});