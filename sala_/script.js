const parametros = new URLSearchParams(window.location.search) // Lê a string da URL ("?sala=1")
const numeroSala = parametros.get('sala') // Pega o valor da chave 'sala'

if (numeroSala) {
    document.getElementById('salaNum').innerText = `Sala ${numeroSala}`
    document.title = `Sala ${numeroSala}`
}

const portaMSG = document.getElementById("porta")
let portaVR = false

const arMSG = document.getElementById("ar")
let arVR = false

const luzMSG = document.getElementById("luz")
let luzVR = false

function voltar() {
    window.location.href="../index.html"
}

function abrirPorta() {
    portaVR = !portaVR
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

function ligarLuz() {
    luzVR = !luzVR
    luzMSG.innerHTML = ""
    if (luzVR === false) {
        luzMSG.innerHTML += "Ligar luz <br>"
        luzMSG.innerHTML += "Status: <b> DESLIGADA </b>" //Colocar variável depois
        luzMSG.style.backgroundColor = "rgb(238, 138, 138)"
    } else {
        luzMSG.innerHTML += "Desligar luz <br>"
        luzMSG.innerHTML += "Status: <b> LIGADO </b>" //Colocar variável depois
        luzMSG.style.backgroundColor = "rgb(198, 233, 198)"
    }
}

function monitoramento() {
    console.log("")
}