//Substitua pelo endereço IP gerado no Serial Monitor do ESP32
const IP_ESP32 = "http://10.14.55.32";
 
// Substitua pelo IP gerado pelo Monitor Serial no ESP32-CAM (ex: http://10.14.52.250:81/stream)
const IP_ESP32_CAM = "http://10.14.52.250:81/stream";
 
const VERDE = "rgb(198, 233, 198)";
const VERMELHO = "rgb(238, 138, 138)";
 
const TEMP_MIN = 16;
const TEMP_MAX = 30;
 
const portaMSG = document.getElementById("porta")
let portaVR = false
 
const arMSG = document.getElementById("ar")
const tempMSG = document.getElementById("tempAr")
let arVR = false
let tempAr = 23
let timerTemp = null // Espera o usuário parar de clicar antes de mandar a temperatura
 
const luzMSG = document.getElementById("luz")
let luzVR = false
 
 
// --- Atualização visual dos botões ---
function renderPorta() {
    if (!portaVR) {
        portaMSG.innerHTML = "Abrir porta <br>Status: <b> FECHADA </b>";
        portaMSG.style.backgroundColor = VERMELHO;
    } else {
        portaMSG.innerHTML = "Fechar porta <br>Status: <b> ABERTA </b>";
        portaMSG.style.backgroundColor = VERDE;
    }
}
 
function renderLuz() {
    if (!luzVR) {
        luzMSG.innerHTML = "Ligar luz <br>Status: <b> DESLIGADA </b>";
        luzMSG.style.backgroundColor = VERMELHO;
    } else {
        luzMSG.innerHTML = "Desligar luz <br>Status: <b> LIGADA </b>";
        luzMSG.style.backgroundColor = VERDE;
    }
}
 
function renderAr() {
    if (!arVR) {
        arMSG.innerHTML = "Ligar ar-condicionado <br>Status: <b> DESLIGADO </b>";
        arMSG.style.backgroundColor = VERMELHO;
    } else {
        arMSG.innerHTML = "Desligar ar-condicionado <br>Status: <b> LIGADO </b>";
        arMSG.style.backgroundColor = VERDE;
    }
    tempMSG.innerText = `${tempAr}ºC`;
}
 
 
// --- Comunicação com o ESP32 ---
async function enviarComando(rota, corpo) {
    const resposta = await fetch(`${IP_ESP32}${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo)
    });
 
    if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        throw new Error(dados.erro || `HTTP ${resposta.status}`);
    }
}


// Lê o estado real do ESP32 (inclui mudanças feitas pelo controle remoto original)
async function atualizarStatus() {
    if (timerTemp) return; // Não sobrescreve uma mudança de temperatura que ainda vai ser enviada
 
    try {
        const resposta = await fetch(`${IP_ESP32}/status`);
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
    } catch (erro) {
        console.warn("Não foi possível ler o status do ESP32:", erro);
    }
}
 
 
// --- Ações dos botões ---
async function abrirPorta() {
    portaVR = !portaVR;
    renderPorta();
 
    try {
        await enviarComando("/tranca", { destrancar: portaVR });
        console.log("Porta")
    } catch (erro) {
        console.error("Erro ao comunicar com o ESP32:", erro);
    }
}
 
async function ligarLuz() {
    luzVR = !luzVR;
    renderLuz();
 
    try {
        await enviarComando("/luz", { ligar: luzVR });
        console.log("Luz")
    } catch (erro) {
        console.error("Erro ao comunicar com o ESP32:", erro);
    }
}
 
async function ligarAr() {
    arVR = !arVR;
    renderAr();
 
    try {
        await enviarComando("/ar", { ligar: arVR, temperatura: tempAr });
        console.log("Ar-condicionado")
    } catch (erro) {
        // Desfaz a mudança na tela se o ESP32 não conseguiu mandar o sinal
        arVR = !arVR;
        renderAr();
        console.error("Erro ao comunicar com o ESP32:", erro);
        alert(`Não foi possível controlar o ar-condicionado.\n${erro.message}`);
    }
}
 
function mudarTemp(delta) {
    tempAr = Math.min(TEMP_MAX, Math.max(TEMP_MIN, tempAr + delta));
    renderAr();
 
    // Só manda o sinal se o ar estiver ligado (senão a temperatura vai junto quando ligar)
    if (!arVR) return;
 
    clearTimeout(timerTemp);
    timerTemp = setTimeout(async () => {
        try {
            await enviarComando("/ar", { ligar: true, temperatura: tempAr });
            console.log(`Temperatura: ${tempAr}ºC`)
        } catch (erro) {
            console.error("Erro ao comunicar com o ESP32:", erro);
            alert(`Não foi possível mudar a temperatura.\n${erro.message}`);
        } finally {
            timerTemp = null;
        }
    }, 500);
}
 
 
// --- Navegação ---
const parametros = new URLSearchParams(window.location.search) // Lê a string da URL ("?sala=1")
const numeroSala = parametros.get('sala') // Pega o valor da chave 'sala'
 
if (numeroSala) {
    document.getElementById('salaNum').innerText = `Sala ${numeroSala}`
    document.title = `Sala ${numeroSala}`
}
 
function voltar() {
    window.location.href="../index.html"
}
 
 
// --- Câmera ---
function monitoramento() {
    const modal = document.getElementById("modalCamera");
    const imgStream = document.getElementById("streamCamera");
 
    // Define a URL da transmissão (MJPEG Stream) da câmera
    imgStream.src = IP_ESP32_CAM;
 
    // Exibe a janela flutuante
    modal.style.display = "flex";
}
 
function fecharMonitoramento() {
    const modal = document.getElementById("modalCamera");
    const imgStream = document.getElementById("streamCamera");
 
    // Interrompe o carregamento da imagem/stream ao fechar a janela
    imgStream.src = "";
 
    // Esconde a janela flutuante
    modal.style.display = "none";
}
 
// Fecha o modal caso o usuário clique fora da caixa de conteúdo
window.onclick = function(event) {
    const modal = document.getElementById("modalCamera");
    if (event.target === modal) {
        fecharMonitoramento();
    }
};
 
 
// Sincroniza ao abrir a página e depois a cada 5 segundos
atualizarStatus();
setInterval(atualizarStatus, 5000);
 
