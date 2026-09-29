#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

/*
=================================================================
FUTURA EXPANSÃO: Biblioteca para Sinais IR de Ar-Condicionado
=================================================================
#include <IRremoteESP8266.h>
#include <IRsend.h>
#include <ir_Gree.h> // Ou ir_LG, ir_Samsung, ir_Midea...
const uint16_t kIrLedPin = 4;
IRGreeAC ac(kIrLedPin);
*/

// --- Credenciais de Rede Wi-Fi ---
const char* ssid = "NOME_DA_SUA_REDE_WIFI";
const char* password = "SENHA_DA_SUA_REDE";

// --- Definição dos Pinos de Hardware ---
const int PIN_RELE_LUZ = 18;       // Relé da luz
const int PIN_TRANCA = 19;         // Tranca elétrica / Relé 2
const int PIN_PIR = 23;            // Sensor de Presença PIR
const int PIN_IR_EMISSOR = 4;      // LED Emissor Infravermelho

// --- Servidor Web HTTP na Porta 80 ---
WebServer server(80);

// --- Variáveis de Estado Interno ---
bool estadoLuz = false;
bool estadoTranca = false; // false = Trancada, true = Destrancada
bool estadoAr = false;

// Configuração de Cabeçalhos CORS (Permite requisições da interface Web)
void aplicarCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

// --- Funções de Controle de Periféricos ---

void setLuz(bool ligar) {
  estadoLuz = ligar;
  // Módulos relé comuns acionam com nível lógico LOW
  digitalWrite(PIN_RELE_LUZ, estadoLuz ? LOW : HIGH);
}

void setTranca(bool destrancar) {
  estadoTranca = destrancar;
  digitalWrite(PIN_TRANCA, estadoTranca ? HIGH : LOW);
}

void enviarComandoIR(bool ligar) {
  estadoAr = ligar;
  
  if (ligar) {
    // Sinal simples de teste para o LED IR (Protótipo)
    digitalWrite(PIN_IR_EMISSOR, HIGH);
    
    /* 
    =================================================================
    FUTURA EXPANSÃO: Envio de pacote IR real para o Ar-Condicionado
    =================================================================
    ac.on();
    ac.setTemp(22);
    ac.setFan(1);
    ac.send();
    */
  } else {
    digitalWrite(PIN_IR_EMISSOR, LOW);
    
    /* 
    =================================================================
    FUTURA EXPANSÃO: Desligar via IR real
    =================================================================
    ac.off();
    ac.send();
    */
  }
}

// --- Rotas HTTP da API ---

void handleOptions() {
  aplicarCORS();
  server.send(204);
}

void handleStatus() {
  aplicarCORS();
  
  StaticJsonDocument<200> doc;
  doc["luz"] = estadoLuz;
  doc["tranca"] = estadoTranca ? "destrancado" : "trancado";
  doc["ar"] = estadoAr;
  doc["presenca"] = (digitalRead(PIN_PIR) == HIGH);

  String respostaJson;
  serializeJson(doc, respostaJson);
  server.send(200, "application/json", respostaJson);
}

void handleLuz() {
  aplicarCORS();
  if (server.hasArg("plain")) {
    StaticJsonDocument<200> doc;
    deserializeJson(doc, server.arg("plain"));
    bool ligar = doc["ligar"];
    setLuz(ligar);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    server.send(400, "application/json", "{\"erro\":\"requisicao incorreta\"}");
  }
}

void handleTranca() {
  aplicarCORS();
  if (server.hasArg("plain")) {
    StaticJsonDocument<200> doc;
    deserializeJson(doc, server.arg("plain"));
    bool destrancar = doc["destrancar"];
    setTranca(destrancar);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    server.send(400, "application/json", "{\"erro\":\"requisicao incorreta\"}");
  }
}

void handleAr() {
  aplicarCORS();
  if (server.hasArg("plain")) {
    StaticJsonDocument<200> doc;
    deserializeJson(doc, server.arg("plain"));
    bool ligar = doc["ligar"];
    enviarComandoIR(ligar);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    server.send(400, "application/json", "{\"erro\":\"requisicao incorreta\"}");
  }
}

// --- Setup e Loop ---

void setup() {
  Serial.begin(115200);

  // Configuração dos Pinos
  pinMode(PIN_RELE_LUZ, OUTPUT);
  pinMode(PIN_TRANCA, OUTPUT);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_IR_EMISSOR, OUTPUT);

  // Estados Iniciais
  setLuz(false);
  setTranca(false);

  /*
  =================================================================
  FUTURA EXPANSÃO: Inicializar IR Protocol
  =================================================================
  ac.begin();
  */

  // Conexão Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi Conectado com sucesso!");
  Serial.print("Endereço IP do ESP32: ");
  Serial.println(WiFi.localIP());

  // Rotas GET / POST
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/luz", HTTP_POST, handleLuz);
  server.on("/tranca", HTTP_POST, handleTranca);
  server.on("/ar", HTTP_POST, handleAr);

  // Rotas Pré-flight CORS (Navegador)
  server.on("/luz", HTTP_OPTIONS, handleOptions);
  server.on("/tranca", HTTP_OPTIONS, handleOptions);
  server.on("/ar", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("Servidor Web HTTP pronto!");
}

void loop() {
  server.handleClient();

  /*
  =================================================================
  FUTURA EXPANSÃO: Lógica Automática com PIR (Ex: Temporizador)
  =================================================================
  static unsigned long ultimoMovimento = 0;
  if (digitalRead(PIN_PIR) == HIGH) {
      ultimoMovimento = millis();
  }
  // Se passar 15 minutos sem movimento, desliga as luzes
  if (millis() - ultimoMovimento > 900000 && estadoLuz) {
      setLuz(false);
  }
  */
}