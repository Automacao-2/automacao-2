const IP_ESP32 = "http://10.14.55.234";
const IP_ESP32_CAM = "http://10.14.52.250:81/stream";

const TEMP_MIN = 16;
const TEMP_MAX = 30;

// Estado global da sala
let portaVR = false;
let luzVR = false;

let ar1VR = false;
let tempAr1 = 23;
let timerTemp1 = null;

let ar2VR = false;
let tempAr2 = 23;
let timerTemp2 = null;

// Elementos de UI
const portaBtn = document.getElementById("btnPorta");
const portaBadge = document.getElementById("badgePorta");
const portaIcon = document.getElementById("iconPorta");

const luzBtn = document.getElementById("btnLuz");
const luzBadge = document.getElementById("badgeLuz");
const luzIcon = document.getElementById("iconLuz");

const connectionStatus = document.getElementById("connectionStatus");
const statusText = document.getElementById("statusText");

function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = `toast show ${isError ? 'error' : ''}`;
    setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}

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
        luzIcon.style.color = "#eab308";
    }
}

function renderAr(id) {
    const isAr1 = id === 1;
    const arVR = isAr1 ? ar1VR : ar2VR;
    const tempAr = isAr1 ? tempAr1 : tempAr2;
    const arBtn = document.getElementById(isAr1 ? "btnAr1" : "btnAr2");
    const arBadge = document.getElementById(isAr1 ? "badgeAr1" : "badgeAr2");
    const arIcon = document.getElementById(isAr1 ? "iconAr1" : "iconAr2");
    const tempDisplay = document.getElementById(isAr1 ? "tempAr1" : "tempAr2");

    if (!arVR) {
        arBtn.innerText = `Ligar Ar 0${id}`;
        arBtn.classList.remove("active");
        arBadge.innerText = "DESLIGADO";
        arBadge.className = "badge badge-desligado";
        arIcon.style.color = "var(--text-muted)";
    } else {
        arBtn.innerText = `Desligar Ar 0${id}`;
        arBtn.classList.add("active");
        arBadge.innerText = "LIGADO";
        arBadge.className = "badge badge-ligado";
        arIcon.style.color = "var(--info)";
    }
    tempDisplay.innerText = tempAr;
}

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
    if (timerTemp1 || timerTemp2) return;

    try {
        const resposta = await fetch(`${IP_ESP32}/status`, { signal: AbortSignal.timeout(3000) });
        const status = await resposta.json();

        luzVR = status.luz;
        portaVR = status.tranca === "destrancado";

        if (status.ar1) {
            ar1VR = status.ar1.ligado;
            tempAr1 = Math.round(status.ar1.temperatura);
        }
        if (status.ar2) {
            ar2VR = status.ar2.ligado;
            tempAr2 = Math.round(status.ar2.temperatura);
        }

        renderPorta();
        renderLuz();
        renderAr(1);
        renderAr(2);
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

async function abrirPorta() {
    portaVR = !portaVR;
    renderPorta();
    try {
        await enviarComando("/tranca", { destrancar: portaVR });
        showToast(portaVR ? "Porta destrancada!" : "Porta trancada!");
    } catch (erro) {
        portaVR = !portaVR;
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
        luzVR = !luzVR;
        renderLuz();
        showToast("Erro ao acionar iluminação.", true);
    }
}

async function ligarAr(id) {
    if (id === 1) {
        ar1VR = !ar1VR;
        renderAr(1);
        try {
            await enviarComando("/ar", { id: 1, ligar: ar1VR, temperatura: tempAr1 });
            showToast(ar1VR ? "Ar 01 ligado!" : "Ar 01 desligado!");
        } catch (erro) {
            ar1VR = !ar1VR;
            renderAr(1);
            showToast("Erro ao acionar Ar 01.", true);
        }
    } else {
        ar2VR = !ar2VR;
        renderAr(2);
        try {
            await enviarComando("/ar", { id: 2, ligar: ar2VR, temperatura: tempAr2 });
            showToast(ar2VR ? "Ar 02 ligado!" : "Ar 02 desligado!");
        } catch (erro) {
            ar2VR = !ar2VR;
            renderAr(2);
            showToast("Erro ao acionar Ar 02.", true);
        }
    }
}

function mudarTemp(id, delta) {
    if (id === 1) {
        tempAr1 = Math.min(TEMP_MAX, Math.max(TEMP_MIN, tempAr1 + delta));
        renderAr(1);
        if (!ar1VR) return;

        clearTimeout(timerTemp1);
        timerTemp1 = setTimeout(async () => {
            try {
                await enviarComando("/ar", { id: 1, ligar: true, temperatura: tempAr1 });
                showToast(`Ar 01 ajustado para ${tempAr1}°C`);
            } catch (erro) {
                showToast("Erro ao mudar temperatura do Ar 01.", true);
            } finally {
                timerTemp1 = null;
            }
        }, 500);
    } else {
        tempAr2 = Math.min(TEMP_MAX, Math.max(TEMP_MIN, tempAr2 + delta));
        renderAr(2);
        if (!ar2VR) return;

        clearTimeout(timerTemp2);
        timerTemp2 = setTimeout(async () => {
            try {
                await enviarComando("/ar", { id: 2, ligar: true, temperatura: tempAr2 });
                showToast(`Ar 02 ajustado para ${tempAr2}°C`);
            } catch (erro) {
                showToast("Erro ao mudar temperatura do Ar 02.", true);
            } finally {
                timerTemp2 = null;
            }
        }, 500);
    }
}

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

const parametros = new URLSearchParams(window.location.search);
const nomeSala = parametros.get('sala');

if (nomeSala) {
    let tituloFormatado = nomeSala;
    if (!isNaN(nomeSala)) {
        tituloFormatado = `Sala ${nomeSala.padStart(2, '0')}`;
    } else {
        tituloFormatado = nomeSala.replace(/_/g, ' ');
    }
    document.getElementById('salaNum').innerText = tituloFormatado;
    document.title = `${tituloFormatado} - Automação IFRJ`;
}

function voltar() {
    window.location.href = "../index.html";
}
