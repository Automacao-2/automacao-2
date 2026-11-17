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

function alternarAndarGrade(andar) {
    const btn1 = document.getElementById("btnAndar1");
    const btn2 = document.getElementById("btnAndar2");
    const grid1 = document.getElementById("gridAndar1");
    const grid2 = document.getElementById("gridAndar2");

    if (andar === 1) {
        btn1.classList.add("active");
        btn2.classList.remove("active");
        grid1.classList.add("active");
        grid2.classList.remove("active");
    } else {
        btn2.classList.add("active");
        btn1.classList.remove("active");
        grid2.classList.add("active");
        grid1.classList.remove("active");
    }
}

// Controle do Tooltip na Planta Baixa
const cacheStatusMapa = {};

async function mostrarTooltip(event, nomeAmbiente) {
    const tooltip = document.getElementById("mapTooltip");
    const titulo = document.getElementById("tipSalaTitulo");
    const statusEl = document.getElementById("tipStatus");
    const luzEl = document.getElementById("tipLuz");
    const trancaEl = document.getElementById("tipTranca");
    const temp1El = document.getElementById("tipTemp1");
    const temp2El = document.getElementById("tipTemp2");

    titulo.innerText = nomeAmbiente;
    atualizarPosicaoTooltip(event);
    tooltip.style.display = "block";

    // Converte "Sala 01" -> "1" ou mantém "Laboratório de..."
    const chaveSala = nomeAmbiente.startsWith("Sala ")
        ? String(parseInt(nomeAmbiente.replace("Sala ", ""), 10))
        : nomeAmbiente;

    const config = obterConfigSala(chaveSala);
    if (!config || !config.ip) return;

    const agora = Date.now();
    if (cacheStatusMapa[chaveSala] && (agora - cacheStatusMapa[chaveSala].timestamp < 5000)) {
        preencherDadosTooltip(cacheStatusMapa[chaveSala].dados, statusEl, luzEl, trancaEl, temp1El, temp2El);
        return;
    }

    statusEl.innerText = "Consultando...";
    statusEl.style.color = "#64748b";

    try {
        const res = await fetch(`${config.ip}/status`, { signal: AbortSignal.timeout(1500) });
        const dados = await res.json();
        cacheStatusMapa[chaveSala] = { timestamp: agora, dados };
        preencherDadosTooltip(dados, statusEl, luzEl, trancaEl, temp1El, temp2El);
    } catch (_) {
        statusEl.innerText = "Offline";
        statusEl.style.color = "#dc2626";
        luzEl.innerText = "--";
        trancaEl.innerText = "--";
        if (temp1El) temp1El.innerText = "--";
        if (temp2El) temp2El.innerText = "--";
    }
}

function preencherDadosTooltip(dados, statusEl, luzEl, trancaEl, temp1El, temp2El) {
    statusEl.innerText = "Online";
    statusEl.style.color = "#16a34a";
    luzEl.innerText = dados.luz ? "Ligada" : "Desligada";
    trancaEl.innerText = dados.tranca === "destrancado" ? "Destrancada" : "Trancada";
    if (temp1El && dados.ar1) temp1El.innerText = `${Math.round(dados.ar1.temperatura)}°C`;
    if (temp2El && dados.ar2) temp2El.innerText = `${Math.round(dados.ar2.temperatura)}°C`;
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