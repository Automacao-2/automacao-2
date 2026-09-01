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
        portaMSG.innerHTML += "Status: <b> FECHADA </b>"
        portaMSG.style.backgroundColor = "rgb(238, 138, 138)"
    } else {
        portaMSG.innerHTML += "Fechar porta <br>"
        portaMSG.innerHTML += "Status: <b> ABERTA </b>"
        portaMSG.style.backgroundColor = "rgb(198, 233, 198)"
    }
    portaVR = !portaVR
}

function ligarAr() {
    arMSG.innerHTML = ""
    if (arVR === false) {
        arMSG.innerHTML += "Ligar ar-condicionado <br>"
        arMSG.innerHTML += "Status: <b> DESLIGADO </b> <br>"
        arMSG.innerHTML += "Temperatura: 23ºC"
        arMSG.style.backgroundColor = "rgb(238, 138, 138)"
    } else {
        arMSG.innerHTML += "Desligar ar-condicionado <br>"
        arMSG.innerHTML += "Status: <b> LIGADO </b> <br>"
        arMSG.innerHTML += "Temperatura: 23ºC"
        arMSG.style.backgroundColor = "rgb(198, 233, 198)"
    }
    arVR = !arVR
}

function ligarLuz() {
    luzMSG.innerHTML = ""
    if (luzVR === false) {
        luzMSG.innerHTML += "Ligar luz <br>"
        luzMSG.innerHTML += "Status: <b> DESLIGADA </b>"
        luzMSG.style.backgroundColor = "rgb(238, 138, 138)"
    } else {
        luzMSG.innerHTML += "Desligar luz <br>"
        luzMSG.innerHTML += "Status: <b> LIGADO </b>"
        luzMSG.style.backgroundColor = "rgb(198, 233, 198)"
    }
    luzVR = !luzVR
}

function monitoramento() {
    console.log("")
}