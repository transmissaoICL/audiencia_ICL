function montarHtmlParaPrint(resultados, programaAtual) {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 1. Separar canais ICL da concorrência (Evita o erro do splice no loop)
    const canaisICL = resultados.filter(r => r.icl);
    const concorrência = resultados.filter(r => !r.icl && Object.values(r.dadosHistoricos).at(-1) > 0);

    // 2. Calcular o Total ICL
    const somaTotalICL = canaisICL.reduce((acc, r) => {
        const valor = Object.values(r.dadosHistoricos || {}).at(-1) || 0;
        return acc + valor;
    }, 0);

    // 3. Criar o objeto de Total com uma estrutura "segura"
    const totalICL = {
        programa: programaAtual,
        total: somaTotalICL,
        isTotal: true,
        dadosHistoricos: {} // Objeto vazio evita o erro do Object.values
    };

    // 4. Montar lista final e Rankear
    const listaParaRankear = [...concorrência, totalICL];

    const resultadosRankeados = listaParaRankear.sort((a, b) => {
        // Pegamos a audiência de A (seja do .total ou do histórico)
        const valorA = a.total ?? Object.values(a.dadosHistoricos || {}).at(-1) ?? 0;
        // Pegamos a audiência de B
        const valorB = b.total ?? Object.values(b.dadosHistoricos || {}).at(-1) ?? 0;

        return valorB - valorA; // Ordem decrescente
    });

    // 5. Gerar as linhas com o RETURN correto
    let linhas = resultadosRankeados.map((r, i) => {        
        // Extraímos a audiência para a linha atual
        const audiencia = r.total ?? Object.values(r.dadosHistoricos || {}).at(-1) ?? 0;
        const nomeCanal = r.programa || r.canal;
        const estiloDestaque = r.isTotal ? 'background-color: #e8f4f8; font-weight: bold;' : '';

        return `
        <tr class="audiencia-line" style="${estiloDestaque}">
            <td style="border: 1px solid #ddd; padding: 8px;"><b>${i + 1}º</b></td>
            <td style="border: 1px solid #ddd; padding: 8px;"><b>${nomeCanal}</b></td>
            <td style="border: 1px solid #ddd; padding: 8px;"><b>${audiencia.toLocaleString('pt-BR')}</b></td>
        </tr>`;
    }).join('');
    
    return `
    <html>
    <head>
        <style>
            body { font-family: sans-serif; padding: 20px; background: white; }
            #tabelaConcorrencia { width: 60%; border-collapse: collapse; }
            .row-header th { padding: 10px; font-size: 18px; }
            .audiencia-line td { text-align: left; }
        </style>
    </head>
    <body>
        <div>
            <h2 style="color: #002d5e; text-align: center;">📊 ${programaAtual}</h2>
            <table id="tabelaConcorrencia">
                <tbody id="tabelaBody"">
                    <tr class="row-concorrencia row-header" style="background-color: #099ace;">
                        <th style="color: #f0f0f0; border: 1px solid black;"></th>
                        <th id="date" style="color: #f0f0f0; border: 1px solid black; width="30%"">Dia ${dataFormatada}</th>
                        <th id="time" style="color: #f0f0f0; border: 1px solid black;">Às ${horaFormatada}</th>
                    </tr>
                    <tr class="row-concorrencia" style="background-color: #099ace;">
                        <th style="color: #f0f0f0; border: 1px solid black;">Pos</th>
                        <th style="color: #f0f0f0; border: 1px solid black;">Canal</th>
                        <th style="color: #f0f0f0; border: 1px solid black;">Audiência</th>
                    </tr>
                    ${linhas}
                </tbody>
            </table>
        </div>
    </body>
    </html>`;
}

module.exports = { montarHtmlParaPrint };