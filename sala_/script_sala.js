// Configuração dos IPs dos dispositivos
const IP_ESP32 = "http://10.14.55.32";
const IP_ESP32_CAM = "http://10.14.52.250:81/stream";

const TEMP_MIN = 16;
const TEMP_MAX = 30;

// Estado global da sala
let portaVR = false;
let luzVR = false;
let arVR = false;
let tempAr = 23;
let timerTemp = null;

// Elementos de UI
const portaBtn = document.getElementById("btnPorta");
const portaBadge = document.getElementById("badgePorta");
const portaIcon = document.getElementById("iconPorta");

const luzBtn = document.getElementById("btnLuz");
const luzBadge = document.getElementById("badgeLuz");
const luzIcon = document.getElementById("iconLuz");

const arBtn = document.getElementById("btnAr");
const arBadge = document.getElementById("badgeAr");
const arIcon = document.getElementById("iconAr");
const tempDisplay = document.getElementById("tempAr");

const connectionStatus = document.getElementById("connectionStatus");
const statusText = document.getElementById("statusText");

// Toast Notification
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = `toast show ${isError ? 'error' : ''}`;
    setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}

// --- Renderização visual ---
function renderPorta() {
    if (!portaVR) {
        portaBtn.innerText = "Abrir Porta";
        portaBtn.classList.remove("active");
        portaBadge.innerText = "TRANCADA";
        portaBadge.className = "badge badge-fechada";
        portaIcon.innerText = "lock";
        portaIcon.style.color = "var(--danger)";
    } else {
        portaBtn.innerText = "Fechar Porta";
        portaBtn.classList.add("active");
        portaBadge.innerText = "DESTRANCADA";
        portaBadge.className = "badge badge-aberta";
        portaIcon.innerText = "lock_open";
        portaIcon.style.color = "var(--success)";
    }
}

function renderLuz() {
    if (!luzVR) {
        luzBtn.innerText = "Ligar Luz";
        luzBtn.classList.remove("active");
        luzBadge.innerText = "DESLIGADA";
        luzBadge.className = "badge badge-desligado";
        luzIcon.innerText = "lightbulb";
        luzIcon.style.color = "var(--text-muted)";
    } else {
        luzBtn.innerText = "Desligar Luz";
        luzBtn.classList.add("active");
        luzBadge.innerText = "LIGADA";
        luzBadge.className = "badge badge-ligado";
        luzIcon.innerText = "lightbulb";
        luzIcon.style.color = "#eab308"; // Amarelo aceso
    }
}

function renderAr() {
    if (!arVR) {
        arBtn.innerText = "Ligar Ar-Condicionado";
        arBtn.classList.remove("active");
        arBadge.innerText = "DESLIGADO";
        arBadge.className = "badge badge-desligado";
        arIcon.style.color = "var(--text-muted)";
    } else {
        arBtn.innerText = "Desligar Ar-Condicionado";
        arBtn.classList.add("active");
        arBadge.innerText = "LIGADO";
        arBadge.className = "badge badge-ligado";
        arIcon.style.color = "var(--info)";
    }
    tempDisplay.innerText = tempAr;
}

// --- Comunicação com ESP32 ---
async function enviarComando(rota, corpo) {
    try {
        const resposta = await fetch(`${IP_ESP32}${rota}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo)
        });

        if (!resposta.ok) {
            const dados = await resposta.json().catch(() => ({}));
            throw new Error(dados.erro || `HTTP ${resposta.status}`);
        }
        setConexaoStatus(true);
    } catch (erro) {
        setConexaoStatus(false);
        throw erro;
    }
}

async function atualizarStatus() {
    if (timerTemp) return; // Aguarda envio do debounce de temperatura

    try {
        const resposta = await fetch(`${IP_ESP32}/status`, { signal: AbortSignal.timeout(3000) });
        const status = await resposta.json();

        luzVR = status.luz;
        portaVR = status.tranca === "destrancado";
        if (status.ar) {
            arVR = status.ar.ligado;
            tempAr = Math.round(status.ar.temperatura);
        }

        renderPorta();
        renderLuz();
        renderAr();
        setConexaoStatus(true);
    } catch (erro) {
        setConexaoStatus(false);
        console.warn("Falha na sincronização com o ESP32:", erro);
    }
}

function setConexaoStatus(online) {
    if (online) {
        connectionStatus.className = "connection-status conectado";
        statusText.innerText = "Online";
    } else {
        connectionStatus.className = "connection-status desconnectado";
        statusText.innerText = "Offline";
    }
}

// --- Ações ---
async function abrirPorta() {
    portaVR = !portaVR;
    renderPorta();

    try {
        await enviarComando("/tranca", { destrancar: portaVR });
        showToast(portaVR ? "Porta destrancada!" : "Porta trancada!");
    } catch (erro) {
        portaVR = !portaVR; // Reverte se falhar
        renderPorta();
        showToast("Erro ao acionar porta.", true);
    }
}

async function ligarLuz() {
    luzVR = !luzVR;
    renderLuz();

    try {
        await enviarComando("/luz", { ligar: luzVR });
        showToast(luzVR ? "Luzes ligadas!" : "Luzes desligadas!");
    } catch (erro) {
        luzVR = !luzVR; // Reverte
        renderLuz();
        showToast("Erro ao acionar iluminação.", true);
    }
}

async function ligarAr() {
    arVR = !arVR;
    renderAr();

    try {
        await enviarComando("/ar", { ligar: arVR, temperatura: tempAr });
        showToast(arVR ? "Ar-condicionado ligado!" : "Ar-condicionado desligado!");
    } catch (erro) {
        arVR = !arVR; // Reverte
        renderAr();
        showToast("Erro ao acionar ar-condicionado.", true);
    }
}

function mudarTemp(delta) {
    tempAr = Math.min(TEMP_MAX, Math.max(TEMP_MIN, tempAr + delta));
    renderAr();

    if (!arVR) return;

    clearTimeout(timerTemp);
    timerTemp = setTimeout(async () => {
        try {
            await enviarComando("/ar", { ligar: true, temperatura: tempAr });
            showToast(`Temperatura ajustada para ${tempAr}°C`);
        } catch (erro) {
            showToast("Erro ao mudar temperatura.", true);
        } finally {
            timerTemp = null;
        }
    }, 500);
}

// --- Câmera ---
function monitoramento() {
    const modal = document.getElementById("modalCamera");
    const imgStream = document.getElementById("streamCamera");
    imgStream.src = IP_ESP32_CAM;
    modal.style.display = "flex";
}

function fecharMonitoramento() {
    const modal = document.getElementById("modalCamera");
    const imgStream = document.getElementById("streamCamera");
    imgStream.src = "";
    modal.style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById("modalCamera");
    if (event.target === modal) {
        fecharMonitoramento();
    }
};

// --- Leitura de Parâmetros e Inicialização ---
const parametros = new URLSearchParams(window.location.search);
const numeroSala = parametros.get('sala');

if (numeroSala) {
    document.getElementById('salaNum').innerText = `Sala ${numeroSala.padStart(2, '0')}`;
    document.title = `Sala ${numeroSala} - Automação IFRJ`;
}

function voltar() {
    window.location.href = "../index.html";
}

// Polling e inicialização
atualizarStatus();
setInterval(atualizarStatus, 5000);
