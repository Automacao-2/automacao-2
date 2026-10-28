function irParaSala(event) {
    const botaoClicado = event.currentTarget;
    const numeroSala = botaoClicado.dataset.sala;
    
    window.location.href = `./sala_/index_sala.html?sala=${numeroSala}`;
}

function irParaSalaMapa(numeroSala) {
    window.location.href = `./sala_/index_sala.html?sala=${numeroSala}`;
}

function alternarVisao(visao) {
    const btnGrid = document.getElementById("btnGrid");
    const btnMapa = document.getElementById("btnMapa");
    const viewGrid = document.getElementById("viewGrid");
    const viewMapa = document.getElementById("viewMapa");

    if (visao === 'grid') {
        btnGrid.classList.add("active");
        btnMapa.classList.remove("active");
        viewGrid.classList.add("active");
        viewMapa.classList.remove("active");
    } else {
        btnMapa.classList.add("active");
        btnGrid.classList.remove("active");
        viewMapa.classList.add("active");
        viewGrid.classList.remove("active");
    }
}

// Controle do Tooltip na Planta Baixa
function mostrarTooltip(event, numeroSala) {
    const tooltip = document.getElementById("mapTooltip");
    const titulo = document.getElementById("tipSalaTitulo");
    const statusEl = document.getElementById("tipStatus");
    const luzEl = document.getElementById("tipLuz");
    const trancaEl = document.getElementById("tipTranca");
    const tempEl = document.getElementById("tipTemp");

    titulo.innerText = `Sala ${String(numeroSala).padStart(2, '0')}`;
    
    // Exemplo de status atual em tempo real (pode ser integrado com API do ESP32)
    statusEl.innerText = "Online";
    statusEl.style.color = "#16a34a";
    luzEl.innerText = numeroSala % 2 === 0 ? "Ligada" : "Desligada";
    trancaEl.innerText = "Trancada";
    tempEl.innerText = "23°C";

    atualizarPosicaoTooltip(event);
    tooltip.style.display = "block";
}

function atualizarPosicaoTooltip(event) {
    const tooltip = document.getElementById("mapTooltip");
    const offsetX = 15;
    const offsetY = 15;
    
    let x = event.clientX + offsetX;
    let y = event.clientY + offsetY;

    if (x + tooltip.offsetWidth > window.innerWidth) {
        x = event.clientX - tooltip.offsetWidth - offsetX;
    }
    if (y + tooltip.offsetHeight > window.innerHeight) {
        y = event.clientY - tooltip.offsetHeight - offsetY;
    }

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

window.addEventListener('mousemove', (event) => {
    const tooltip = document.getElementById("mapTooltip");
    if (tooltip.style.display === "block") {
        atualizarPosicaoTooltip(event);
    }
});

function esconderTooltip() {
    const tooltip = document.getElementById("mapTooltip");
    tooltip.style.display = "none";
}