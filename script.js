function irParaSala(event) {
    const botaoClicado = event.currentTarget;
    const numeroSala = botaoClicado.dataset.sala;
    
    // Redireciona para a página da sala correspondente
    window.location.href = `./sala_/index_sala.html?sala=${numeroSala}`;
}