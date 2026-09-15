// =================================================================
// CONFIGURAÇÃO DO PROTÓTIPO (1 SALA)
// =================================================================
// Insira o IP da sua ESP32 impresso no Monitor Serial (ex: "http://192.168.1.100")
const ESP_IP = "http://192.168.1.100";

/* 
=================================================================
FUTURA EXPANSÃO: Mapeamento Dinâmico para Múltiplas Salas
=================================================================
const parametros = new URLSearchParams(window.location.search);
const numeroSala = parametros.get('sala');

const IPS_SALAS = {
    "1": "http://192.168.1.101",
    "2": "http://192.168.1.102",
    "3": "http://192.168.1.103"
};

const ESP_IP = IPS_SALAS[numeroSala] || "http://192.168.1.100";
*/

// Atualiza o título da página para a sala atual
const parametros = new URLSearchParams(window.location.search);
const numeroSala = parametros.get('sala') || "1";
if (document.getElementById('salaNum')) {
    document.getElementById('salaNum').innerText = `Sala ${numeroSala}`;
    document.title = `Sala ${numeroSala}`;
}

// --- Referências aos Elementos do DOM e Estados Locais ---
const portaMSG = document.getElementById("porta");
let portaVR = false;

const arMSG = document.getElementById("ar");
let arVR = false;

const luzMSG = document.getElementById("luz");
let luzVR = false;

const monitorarMSG = document.getElementById("monitorar");

function voltar() {
    window.location.href = "../index.html";
}

// --- Funções de Atualização da Interface Visual ---

function atualizarInterfacePorta(aberta) {
    portaVR = aberta;
    if (!portaMSG) return;
    portaMSG.innerHTML = "";
    if (!portaVR) {
        portaMSG.innerHTML += "Abrir porta <br>";
        portaMSG.innerHTML += "Status: <b> TRANCADA </b>";
        portaMSG.style.backgroundColor = "rgb(238, 138, 138)";
    } else {
        portaMSG.innerHTML += "Fechar porta <br>";
        portaMSG.innerHTML += "Status: <b> DESTRANCADA </b>";
        portaMSG.style.backgroundColor = "rgb(198, 233, 198)";
    }
}

function atualizarInterfaceAr(ligado) {
    arVR = ligado;
    if (!arMSG) return;
    arMSG.innerHTML = "";
    if (!arVR) {
        arMSG.innerHTML += "Ligar ar-condicionado <br>";
        arMSG.innerHTML += "Status: <b> DESLIGADO </b> <br>";
        arMSG.innerHTML += "Temperatura: 23ºC";
        arMSG.style.backgroundColor = "rgb(238, 138, 138)";
    } else {
        arMSG.innerHTML += "Desligar ar-condicionado <br>";
        arMSG.innerHTML += "Status: <b> LIGADO </b> <br>";
        arMSG.innerHTML += "Temperatura: 23ºC";
        arMSG.style.backgroundColor = "rgb(198, 233, 198)";
    }
}

function atualizarInterfaceLuz(ligada) {
    luzVR = ligada;
    if (!luzMSG) return;
    luzMSG.innerHTML = "";
    if (!luzVR) {
        luzMSG.innerHTML += "Ligar luz <br>";
        luzMSG.innerHTML += "Status: <b> DESLIGADA </b>";
        luzMSG.style.backgroundColor = "rgb(238, 138, 138)";
    } else {
        luzMSG.innerHTML += "Desligar luz <br>";
        luzMSG.innerHTML += "Status: <b> LIGADA </b>";
        luzMSG.style.backgroundColor = "rgb(198, 233, 198)";
    }
}

function atualizarInterfacePIR(comPresenca) {
    if (!monitorarMSG) return;
    monitorarMSG.innerHTML = "";
    if (comPresenca) {
        monitorarMSG.innerHTML += "Monitorar <br>";
        monitorarMSG.innerHTML += "Status: <b> MOVIMENTO </b>";
        monitorarMSG.style.backgroundColor = "rgb(198, 233, 198)";
    } else {
        monitorarMSG.innerHTML += "Monitorar <br>";
        monitorarMSG.innerHTML += "Status: <b> SEM PRESENÇA </b>";
        monitorarMSG.style.backgroundColor = "rgb(238, 138, 138)";
    }
}

// --- Funções de Ação (Comunicação HTTP com a ESP32) ---

async function abrirPorta() {
    const novoEstado = !portaVR;
    atualizarInterfacePorta(novoEstado);
    try {
        await fetch(`${ESP_IP}/tranca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destrancar: novoEstado })
        });
    } catch (erro) {
        console.error("Erro ao enviar comando para a tranca:", erro);
    }
}

async function ligarAr() {
    const novoEstado = !arVR;
    atualizarInterfaceAr(novoEstado);
    try {
        await fetch(`${ESP_IP}/ar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ligar: novoEstado })
        });
    } catch (erro) {
        console.error("Erro ao enviar comando para o ar-condicionado:", erro);
    }
}

async function ligarLuz() {
    const novoEstado = !luzVR;
    atualizarInterfaceLuz(novoEstado);
    try {
        await fetch(`${ESP_IP}/luz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ligar: novoEstado })
        });
    } catch (erro) {
        console.error("Erro ao enviar comando para a luz:", erro);
    }
}

// Consulta periodicamente o estado atual da ESP32 (sensores e atuadores)
async function monitoramento() {
    try {
        const resposta = await fetch(`${ESP_IP}/status`);
        if (resposta.ok) {
            const dados = await resposta.json();
            atualizarInterfaceLuz(dados.luz);
            atualizarInterfacePorta(dados.tranca === "destrancado");
            atualizarInterfaceAr(dados.ar);
            atualizarInterfacePIR(dados.presenca);
        }
    } catch (erro) {
        console.error("Erro de sincronização com a ESP32:", erro);
    }
}

// Inicializa a consulta assim que a página carrega e atualiza o PIR a cada 3 segundos
document.addEventListener("DOMContentLoaded", () => {
    monitoramento();
    setInterval(monitoramento, 3000);
});