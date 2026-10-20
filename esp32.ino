#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <IRremoteESP8266.h>
#include <IRrecv.h>
#include <IRsend.h>
#include <IRac.h>
#include <IRutils.h>

//Credenciais de Rede Wi-Fi
//const char* ssid = "NOME_DA_SUA_REDE_WIFI";
//const char* password = "SENHA_DA_SUA_REDE";

const char* ssid = "Visitante";
const char* password = "Bemvindo";

//Definição dos Pinos de Hardware
const int PIN_RELE_LUZ = 5;       // Relé da luz
const int PIN_TRANCA = 19;        // Tranca elétrica / Relé 2
const int PIN_PIR = 23;           // Sensor de Presença PIR
const int PIN_RECEPTOR_1838 = 16; // Sinal 'S' do Receptor IR (VS1838B)
const int PIN_EMISSOR_IR = 4;     // LED infravermelho (via transistor) para o ar-condicionado

//Instância do Receptor IR
// Sinais de ar-condicionado são bem mais longos que os de controle de TV,
// por isso o buffer maior (1024) e o timeout de 50 ms.
const uint16_t kTamanhoBufferIR = 1024;
const uint8_t kTimeoutIR = 50;
IRrecv irrecv(PIN_RECEPTOR_1838, kTamanhoBufferIR, kTimeoutIR, true);
decode_results resultadosIR;

//Controle do Ar-Condicionado (suporta dezenas de marcas: Gree, Midea, LG, Samsung, Daikin...)
IRac ar(PIN_EMISSOR_IR);
Preferences prefs; // Guarda a marca/modelo aprendidos mesmo após reiniciar

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


// --- Ar-Condicionado ---
const char* modoParaTexto(stdAc::opmode_t modo) {
  switch (modo) {
    case stdAc::opmode_t::kHeat: return "quente";
    case stdAc::opmode_t::kAuto: return "auto";
    case stdAc::opmode_t::kFan:  return "ventilar";
    case stdAc::opmode_t::kDry:  return "seco";
    default:                     return "frio";
  }
}

stdAc::opmode_t textoParaModo(const String& texto) {
  if (texto == "quente")   return stdAc::opmode_t::kHeat;
  if (texto == "auto")     return stdAc::opmode_t::kAuto;
  if (texto == "ventilar") return stdAc::opmode_t::kFan;
  if (texto == "seco")     return stdAc::opmode_t::kDry;
  return stdAc::opmode_t::kCool;
}

bool arConfigurado() {
  return ar.next.protocol != decode_type_t::UNKNOWN;
}

void salvarProtocoloAr() {
  prefs.putInt("protocolo", (int)ar.next.protocol);
  prefs.putShort("modelo", ar.next.model);
}

// Envia o estado completo (ligado, modo, temperatura...) para o ar
bool enviarAr() {
  if (!arConfigurado()) return false;
  irrecv.disableIRIn();   // Evita que o receptor leia o próprio sinal enviado
  bool ok = ar.sendAc();
  irrecv.enableIRIn();
  return ok;
}


// Lógica de verificação e leitura do sensor IR
void verificarReceptorIR() {
  if (!irrecv.decode(&resultadosIR)) return;

  // Converte o valor lido para String Hexadecimal
  ultimoCodigoIR = resultToHexidecimal(&resultadosIR);
  decode_type_t protocolo = resultadosIR.decode_type;

  Serial.print("Sinal IR Recebido: ");
  Serial.println(ultimoCodigoIR);
  Serial.print("Protocolo: ");
  Serial.println(typeToString(protocolo));

  // Se for um controle de ar-condicionado conhecido, aprende a marca e
  // sincroniza o estado (assim o site acompanha quem usar o controle original)
  if (IRac::isProtocolSupported(protocolo)) {
    stdAc::state_t lido;
    if (IRAcUtils::decodeToState(&resultadosIR, &lido, &ar.next)) {
      bool protocoloNovo = (lido.protocol != ar.next.protocol) || (lido.model != ar.next.model);
      ar.next = lido;
      ar.markAsSent(); // O controle original já enviou esse estado

      if (protocoloNovo) {
        salvarProtocoloAr();
        Serial.print("Ar-condicionado aprendido: ");
        Serial.print(typeToString(lido.protocol));
        Serial.print(" (modelo ");
        Serial.print(lido.model);
        Serial.println(")");
      }
      Serial.println(IRAcUtils::resultAcToString(&resultadosIR));
    }
  }

  // Prepara o sensor para a próxima leitura
  irrecv.resume();
}


// --- Rotas HTTP da API ---
void handleOptions() {
  aplicarCORS();
  server.send(204);
}


void handleStatus() {
  aplicarCORS();

  StaticJsonDocument<512> doc;
  doc["luz"] = estadoLuz;
  doc["tranca"] = estadoTranca ? "destrancado" : "trancado";
  doc["presenca"] = (digitalRead(PIN_PIR) == HIGH);
  doc["ultimo_ir"] = ultimoCodigoIR;

  doc["ar"]["configurado"] = arConfigurado();
  doc["ar"]["protocolo"] = typeToString(ar.next.protocol);
  doc["ar"]["ligado"] = ar.next.power;
  doc["ar"]["temperatura"] = ar.next.degrees;
  doc["ar"]["modo"] = modoParaTexto(ar.next.mode);

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

// Corpo aceito (todos os campos opcionais):
// { "ligar": true, "temperatura": 23, "modo": "frio" | "quente" | "auto" | "ventilar" | "seco" }
void handleAr() {
  aplicarCORS();

  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"erro\":\"requisicao incorreta\"}");
    return;
  }

  if (!arConfigurado()) {
    server.send(409, "application/json",
      "{\"erro\":\"Ar ainda nao configurado: aponte o controle original para o receptor IR e aperte qualquer botao\"}");
    return;
  }

  StaticJsonDocument<200> doc;
  if (deserializeJson(doc, server.arg("plain"))) {
    server.send(400, "application/json", "{\"erro\":\"JSON invalido\"}");
    return;
  }

  if (doc["ligar"].is<bool>()) {
    ar.next.power = doc["ligar"].as<bool>();
  }
  if (doc["temperatura"].is<float>()) {
    ar.next.degrees = constrain(doc["temperatura"].as<float>(), 16.0f, 30.0f);
  }
  if (doc["modo"].is<const char*>()) {
    ar.next.mode = textoParaModo(doc["modo"].as<String>());
  }
  ar.next.celsius = true;

  if (enviarAr()) {
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    server.send(500, "application/json", "{\"erro\":\"falha ao enviar o sinal IR\"}");
  }
}


void enviarDadosParaWroom() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    // Substitua pelo IP real do seu ESP32 Wroom
    http.begin("http://192.168.1.50/luz");
    http.addHeader("Content-Type", "application/json");

    // Envia um JSON simulando um comando
    int httpResponseCode = http.POST("{\"ligar\":true}");

    if (httpResponseCode > 0) {
      String resposta = http.getString();
      Serial.println(resposta);
    } else {
      Serial.print("Erro no envio: ");
      Serial.println(httpResponseCode);
    }
    http.end();
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

  // Estado inicial do ar (não é enviado no boot, para não desligar o ar sem querer)
  prefs.begin("ar", false);
  ar.next.protocol = (decode_type_t)prefs.getInt("protocolo", (int)decode_type_t::UNKNOWN);
  ar.next.model = prefs.getShort("modelo", -1);
  ar.next.power = false;
  ar.next.mode = stdAc::opmode_t::kCool;
  ar.next.celsius = true;
  ar.next.degrees = 23;
  ar.next.fanspeed = stdAc::fanspeed_t::kAuto;
  ar.next.swingv = stdAc::swingv_t::kAuto;

  if (arConfigurado()) {
    Serial.print("Ar-condicionado configurado: ");
    Serial.println(typeToString(ar.next.protocol));
  } else {
    Serial.println("Ar-condicionado ainda nao configurado: aponte o controle original para o receptor IR e aperte um botao.");
  }

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
  server.on("/ar", HTTP_POST, handleAr);

  server.on("/luz", HTTP_OPTIONS, handleOptions);
  server.on("/tranca", HTTP_OPTIONS, handleOptions);
  server.on("/ar", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("Servidor Web HTTP pronto!");
}

void loop() {
  // Trata requisições HTTP do aplicativo/navegador
  server.handleClient();

  // Verifica continuamente se o receptor IR capturou algum botão
  verificarReceptorIR();
}
