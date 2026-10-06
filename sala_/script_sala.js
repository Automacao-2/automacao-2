const portaMSG = document.getElementById("porta")
let portaVR = false

const arMSG = document.getElementById("ar")
let arVR = false

const luzMSG = document.getElementById("luz")
let luzVR = false

//Substitua pelo endereço IP gerado no Serial Monitor do ESP32
const IP_ESP32 = "http://10.14.52.70"; 

async function abrirPorta() {
    portaVR = !portaVR;
    
    if (!portaVR) {
        portaMSG.innerHTML = "Abrir porta <br>Status: <b> FECHADA </b>";
        portaMSG.style.backgroundColor = "rgb(238, 138, 138)";
    } else {
        portaMSG.innerHTML = "Fechar porta <br>Status: <b> ABERTA </b>";
        portaMSG.style.backgroundColor = "rgb(198, 233, 198)";
    }

    try {
        await fetch(`${IP_ESP32}/tranca`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ destrancar: portaVR })
        });
        console.log("Porta")
    } catch (erro) {
        console.error("Erro ao comunicar com o ESP32:", erro);
    }
}

async function ligarLuz() {
    luzVR = !luzVR;

    if (!luzVR) {
        luzMSG.innerHTML = "Ligar luz <br>Status: <b> DESLIGADA </b>";
        luzMSG.style.backgroundColor = "rgb(238, 138, 138)";
    } else {
        luzMSG.innerHTML = "Desligar luz <br>Status: <b> LIGADA </b>";
        luzMSG.style.backgroundColor = "rgb(198, 233, 198)";
    }

    try {
        await fetch(`${IP_ESP32}/luz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ligar: luzVR })
        });
        console.log("Luz")
    } catch (erro) {
        console.error("Erro ao comunicar com o ESP32:", erro);
    }
}

const parametros = new URLSearchParams(window.location.search) // Lê a string da URL ("?sala=1")
const numeroSala = parametros.get('sala') // Pega o valor da chave 'sala'

if (numeroSala) {
    document.getElementById('salaNum').innerText = `Sala ${numeroSala}`
    document.title = `Sala ${numeroSala}`
}

function voltar() {
    window.location.href="../index.html"
}

function ligarAr() {
    arVR = !arVR
    arMSG.innerHTML = ""
    if (arVR === false) {
        arMSG.innerHTML += "Ligar ar-condicionado <br>"
        arMSG.innerHTML += "Status: <b> DESLIGADO </b> <br>"
        arMSG.innerHTML += "Temperatura: 23ºC" //Colocar variável depois
        arMSG.style.backgroundColor = "rgb(238, 138, 138)"
    } else {
        arMSG.innerHTML += "Desligar ar-condicionado <br>"
        arMSG.innerHTML += "Status: <b> LIGADO </b> <br>"
        arMSG.innerHTML += "Temperatura: 23ºC" //Colocar variável depois
        arMSG.style.backgroundColor = "rgb(198, 233, 198)"
    }
}

function monitoramento() {
    console.log("")
}