#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <IRremoteESP8266.h>
#include <IRrecv.h>
#include <IRutils.h>

//Credenciais de Rede Wi-Fi
//const char* ssid = "NOME_DA_SUA_REDE_WIFI";
//const char* password = "SENHA_DA_SUA_REDE";

const char* ssid = "Visitante";
const char* password = "Bemvindo";

//Definição dos Pinos de Hardware
const int PIN_RELE_LUZ = 5;      // Relé da luz
const int PIN_TRANCA = 19;        // Tranca elétrica / Relé 2
const int PIN_PIR = 23;           // Sensor de Presença PIR
const int PIN_RECEPTOR_1838 = 16; // Sinal 'S' do Receptor IR (VS1838B)

//Instância do Receptor IR
IRrecv irrecv(PIN_RECEPTOR_1838);
decode_results resultadosIR;

//Servidor Web HTTP na Porta 80
WebServer server(80);

//Variáveis de Estado Interno
bool estadoLuz = false;
bool estadoTranca = false; // false = Trancada, true = Destrancada
String ultimoCodigoIR = "Nenhum";

//Configuração de Cabeçalhos CORS
void aplicarCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

//Funções de Controle
void setLuz(bool ligar) {
  estadoLuz = ligar;
  Serial.print(ligar);
  digitalWrite(PIN_RELE_LUZ, estadoLuz ? HIGH : LOW);
}

void setTranca(bool destrancar) {
  estadoTranca = destrancar;
  digitalWrite(PIN_TRANCA, estadoTranca ? HIGH : LOW);
}

// Lógica de verificação e leitura do sensor IR
void verificarReceptorIR() {
  if (irrecv.decode(&resultadosIR)) {
    // Converte o valor numérico lido para String Hexadecimal
    ultimoCodigoIR = resultToHexidecimal(&resultadosIR);
    
    Serial.print("Sinal IR Recebido: ");
    Serial.println(ultimoCodigoIR);
    Serial.print("Protocolo: ");
    Serial.println(typeToString(resultadosIR.decode_type));

    // Prepara o sensor para a próxima leitura
    irrecv.resume();
  }
}

// --- Rotas HTTP da API ---

void handleOptions() {
  aplicarCORS();
  server.send(204);
}

void handleStatus() {
  aplicarCORS();
  
  StaticJsonDocument<250> doc;
  doc["luz"] = estadoLuz;
  doc["tranca"] = estadoTranca ? "destrancado" : "trancado";
  doc["presenca"] = (digitalRead(PIN_PIR) == HIGH);
  doc["ultimo_ir"] = ultimoCodigoIR;

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

// --- Setup e Loop ---

void setup() {
  Serial.begin(115200);

  // Configuração dos Pinos
  pinMode(PIN_RELE_LUZ, OUTPUT);
  pinMode(PIN_TRANCA, OUTPUT);
  pinMode(PIN_PIR, INPUT);

  // Inicializa a escuta do receptor VS1838B
  irrecv.enableIRIn();

  // Estados Iniciais
  setLuz(false);
  setTranca(false);

  // Conexão Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao Wi-Fi");
  
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Conectado com sucesso!");
    Serial.print("Endereço IP do ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFalha ao conectar ao Wi-Fi! Verifique a senha ou se a rede é 2.4GHz.");
  }

  // Registra as rotas da API
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/luz", HTTP_POST, handleLuz);
  server.on("/tranca", HTTP_POST, handleTranca);

  server.on("/luz", HTTP_OPTIONS, handleOptions);
  server.on("/tranca", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("Servidor Web HTTP pronto!");
}

void loop() {
  // Trata requisições HTTP do aplicativo/navegador
  server.handleClient();

  // Verifica continuamente se o receptor IR capturou algum botão
  verificarReceptorIR();
}