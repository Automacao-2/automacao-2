function irParaSala_(event) {
    const botaoClicado = event.currentTarget // Vê qual botão foi clicado
    const numeroSala = botaoClicado.dataset.sala //Lê o valor de 'data-sala'
    
    // Redireciona passando o número na URL (Query Parameter)
    window.location.href = `./sala_/index_sala.html?sala=${numeroSala}`
}