const portaMSG = document.getElementById("porta")
let portaVR = false

const arMSG = document.getElementById("ar")
let arVR = false

const luzMSG = document.getElementById("luz")
let luzVR = false

function abrirPorta() {
    portaMSG.innerHTML = ""
    if (portaVR === false) {
        portaMSG.innerHTML += "Abrir porta <br>"
        portaMSG.innerHTML += "Status: FECHADA"
    } else {
        portaMSG.innerHTML += "Fechar porta <br>"
        portaMSG.innerHTML += "Status: ABERTA"
    }
    portaVR = !portaVR
}

function ligarAr() {
    arMSG.innerHTML = ""
    if (arVR === false) {
        arMSG.innerHTML += "Ligar ar-condicionado <br>"
        arMSG.innerHTML += "Status: DESLIGADO <br>"
        arMSG.innerHTML += "Temperatura: 23ºC"
    } else {
        arMSG.innerHTML += "Desligar ar-condicionado <br>"
        arMSG.innerHTML += "Status: LIGADO <br>"
        arMSG.innerHTML += "Temperatura: 23ºC"
    }
    arVR = !arVR
}

function ligarLuz() {
    luzMSG.innerHTML = ""
    if (luzVR === false) {
        luzMSG.innerHTML += "Ligar luz <br>"
        luzMSG.innerHTML += "Status: DESLIGADA"
    } else {
        luzMSG.innerHTML += "Desligar luz <br>"
        luzMSG.innerHTML += "Status: LIGADO"
    }
    luzVR = !luzVR
}

function monitoramento() {
    console.log("")
}