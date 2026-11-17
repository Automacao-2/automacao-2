const MODO_PROTOTIPO = true;

// Altere o IP do protótipo para o IP estático que configurou no ESP32:
const PROTOTIPO_CONFIG = {
    ip: "http://10.14.53.149", // <-- Coloque o seu IP fixo exato aqui
    cam: "http://10.14.52.250:81/stream"
};

// Dicionário escalável para todas as salas e laboratórios (usado quando MODO_PROTOTIPO = false)
const SALAS_CONFIG = {
    "1":  { nome: "Sala 01", ip: "http://esp32-sala01.local", cam: "http://192.168.1.101:81/stream" },
    "2":  { nome: "Sala 02", ip: "http://esp32-sala02.local", cam: "http://192.168.1.102:81/stream" },
    "3":  { nome: "Sala 03", ip: "http://esp32-sala03.local", cam: "http://192.168.1.103:81/stream" },
    "4":  { nome: "Sala 04", ip: "http://esp32-sala04.local", cam: "http://192.168.1.104:81/stream" },
    "5":  { nome: "Sala 05", ip: "http://esp32-sala05.local", cam: "http://192.168.1.105:81/stream" },
    "6":  { nome: "Sala 06", ip: "http://esp32-sala06.local", cam: "http://192.168.1.106:81/stream" },
    "7":  { nome: "Sala 07", ip: "http://esp32-sala07.local", cam: "http://192.168.1.107:81/stream" },
    "8":  { nome: "Sala 08", ip: "http://esp32-sala08.local", cam: "http://192.168.1.108:81/stream" },
    "9":  { nome: "Sala 09", ip: "http://esp32-sala09.local", cam: "http://192.168.1.109:81/stream" },
    "10": { nome: "Sala 10", ip: "http://esp32-sala10.local", cam: "http://192.168.1.110:81/stream" },
    "11": { nome: "Sala 11", ip: "http://esp32-sala11.local", cam: "http://192.168.1.111:81/stream" },
    "12": { nome: "Sala 12", ip: "http://esp32-sala12.local", cam: "http://192.168.1.112:81/stream" },
    "Laboratório de Línguas":     { nome: "Laboratório de Línguas",     ip: "http://esp32-lab-linguas.local",     cam: "" },
    "Laboratório de Informática": { nome: "Laboratório de Informática", ip: "http://esp32-lab-informatica.local", cam: "" },
    "Laboratório de Matemática":  { nome: "Laboratório de Matemática",  ip: "http://esp32-lab-matematica.local",  cam: "" },
    "Laboratório de Física":      { nome: "Laboratório de Física",      ip: "http://esp32-lab-fisica.local",      cam: "" },
    "Laboratório de Biologia":    { nome: "Laboratório de Biologia",    ip: "http://esp32-lab-biologia.local",    cam: "" },
    "Laboratório de Química":     { nome: "Laboratório de Química",     ip: "http://esp32-lab-quimica.local",     cam: "" }
};

function obterConfigSala(idSala) {
    if (MODO_PROTOTIPO) {
        return {
            nome: SALAS_CONFIG[idSala]?.nome || `Sala ${idSala}`,
            ip: PROTOTIPO_CONFIG.ip,
            cam: PROTOTIPO_CONFIG.cam
        };
    }
    return SALAS_CONFIG[idSala] || null;
}