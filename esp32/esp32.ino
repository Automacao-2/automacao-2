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

// Credenciais de Rede Wi-Fi
//const char* ssid = "NOME_DA_SUA_REDE_WIFI";
//const char* password = "SENHA_DA_SUA_REDE";

const char* ssid = "Visitante";
const char* password = "Bemvindo";

// Definição dos Pinos de Hardware
const int PIN_RELE_LUZ = 5;       // Relé da luz
const int PIN_TRANCA = 19;        // Tranca elétrica / Relé 2
const int PIN_PIR = 23;           // Sensor de Presença PIR
const int PIN_RECEPTOR_1838 = 16; // Sinal 'S' do Receptor IR (VS1838B)

// Dois Pinos Emissores Dedicados
const int PIN_EMISSOR_IR1 = 4;    // LED infravermelho Ar 01
const int PIN_EMISSOR_IR2 = 17;   // LED infravermelho Ar 02

// Instância do Receptor IR
const uint16_t kTamanhoBufferIR = 1024;
const uint8_t kTimeoutIR = 50;
IRrecv irrecv(PIN_RECEPTOR_1838, kTamanhoBufferIR, kTimeoutIR, true);
decode_results resultadosIR;

// Duas Instâncias de Controle IRac
IRac ar1(PIN_EMISSOR_IR1);
IRac ar2(PIN_EMISSOR_IR2);
Preferences prefs; // Guarda a marca/modelo aprendidos mesmo após reiniciar

// Servidor Web HTTP na Porta 80
WebServer server(80);

// Variáveis de Estado Interno
bool estadoLuz = false;
bool estadoTranca = false;
String ultimoCodigoIR = "Nenhum";

// Controle de reconexão Wi-Fi
unsigned long ultimaTentativaConexao = 0;
const unsigned long INTERVALO_RECONEXAO = 10000; // Tenta reconectar a cada 10s se cair

void aplicarCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void setLuz(bool ligar) {
  estadoLuz = ligar;
  Serial.print("Luz alterada para: ");
  Serial.println(ligar ? "LIGADA" : "DESLIGADA");
  digitalWrite(PIN_RELE_LUZ, estadoLuz ? HIGH : LOW);
}

void setTranca(bool destrancar) {
  estadoTranca = destrancar;
  Serial.print("Tranca alterada para: ");
  Serial.println(destrancar ? "DESTRANCADA" : "TRANCADA");
  digitalWrite(PIN_TRANCA, estadoTranca ? HIGH : LOW);
}

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

bool arConfigurado(IRac &arInst) {
  return arInst.next.protocol != decode_type_t::UNKNOWN;
}

void salvarProtocoloAr(int id, decode_type_t prot, int16_t mod) {
  prefs.begin("ar", false);
  if (id == 1) {
    prefs.putInt("prot1", (int)prot);
    prefs.putShort("mod1", mod);
  } else {
    prefs.putInt("prot2", (int)prot);
    prefs.putShort("mod2", mod);
  }
  prefs.end();
  Serial.printf("[MEMÓRIA] Protocolo do Ar %d salvo com sucesso!\n", id);
}

bool enviarAr(IRac &arInst) {
  if (!arConfigurado(arInst)) return false;
  irrecv.disableIRIn(); // Evita que o receptor leia o próprio sinal enviado
  bool ok = arInst.sendAc();
  irrecv.enableIRIn();
  return ok;
}

// Leitura do Receptor IR com feedback visual no Serial
void verificarReceptorIR() {
  if (!irrecv.decode(&resultadosIR)) return;

  ultimoCodigoIR = resultToHexidecimal(&resultadosIR);
  decode_type_t protocolo = resultadosIR.decode_type;

  Serial.println("=================================");
  Serial.print("Sinal IR Recebido: ");
  Serial.println(ultimoCodigoIR);
  Serial.print("Protocolo Detectado: ");
  Serial.println(typeToString(protocolo));

  if (IRac::isProtocolSupported(protocolo)) {
    stdAc::state_t lido;
    // Tenta sincronizar com Ar 1
    if (IRAcUtils::decodeToState(&resultadosIR, &lido, &ar1.next)) {
      bool protNovo = (lido.protocol != ar1.next.protocol) || (lido.model != ar1.next.model);
      ar1.next = lido;
      ar1.markAsSent();
      if (protNovo) salvarProtocoloAr(1, lido.protocol, lido.model);
      Serial.println("[AR 1] Estado atualizado pelo controle físico.");
    }
    
    // Tenta sincronizar com Ar 2
    if (IRAcUtils::decodeToState(&resultadosIR, &lido, &ar2.next)) {
      bool protNovo = (lido.protocol != ar2.next.protocol) || (lido.model != ar2.next.model);
      ar2.next = lido;
      ar2.markAsSent();
      if (protNovo) salvarProtocoloAr(2, lido.protocol, lido.model);
      Serial.println("[AR 2] Estado atualizado pelo controle físico.");
    }
    Serial.println(IRAcUtils::resultAcToString(&resultadosIR));
  }
  Serial.println("=================================");

  irrecv.resume();
}

// Resiliência de conexão Wi-Fi
void gerenciarConexaoWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long agora = millis();
    if (agora - ultimaTentativaConexao >= INTERVALO_RECONEXAO) {
      ultimaTentativaConexao = agora;
      Serial.println("[Wi-Fi] Conexão perdida. Tentando reconectar...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
  }
}

// --- Rotas HTTP ---
void handleOptions() {
  aplicarCORS();
  server.send(204);
}

void handleStatus() {
  aplicarCORS();

  StaticJsonDocument<768> doc;
  doc["luz"] = estadoLuz;
  doc["tranca"] = estadoTranca ? "destrancado" : "trancado";
  doc["presenca"] = (digitalRead(PIN_PIR) == HIGH);
  doc["ultimo_ir"] = ultimoCodigoIR;

  doc["ar1"]["configurado"] = arConfigurado(ar1);
  doc["ar1"]["protocolo"] = typeToString(ar1.next.protocol);
  doc["ar1"]["ligado"] = ar1.next.power;
  doc["ar1"]["temperatura"] = ar1.next.degrees;
  doc["ar1"]["modo"] = modoParaTexto(ar1.next.mode);

  doc["ar2"]["configurado"] = arConfigurado(ar2);
  doc["ar2"]["protocolo"] = typeToString(ar2.next.protocol);
  doc["ar2"]["ligado"] = ar2.next.power;
  doc["ar2"]["temperatura"] = ar2.next.degrees;
  doc["ar2"]["modo"] = modoParaTexto(ar2.next.mode);

  String respostaJson;
  serializeJson(doc, respostaJson);
  server.send(200, "application/json", respostaJson);
}

void handleLuz() {
  aplicarCORS();
  if (server.hasArg("plain")) {
    StaticJsonDocument<200> doc;
    deserializeJson(doc, server.arg("plain"));
    setLuz(doc["ligar"]);
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
    setTranca(doc["destrancar"]);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    server.send(400, "application/json", "{\"erro\":\"requisicao incorreta\"}");
  }
}

void handleAr() {
  aplicarCORS();
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"erro\":\"requisicao incorreta\"}");
    return;
  }

  StaticJsonDocument<300> doc;
  if (deserializeJson(doc, server.arg("plain"))) {
    server.send(400, "application/json", "{\"erro\":\"JSON invalido\"}");
    return;
  }

  int idAr = doc["id"] | 1;
  IRac &arAlvo = (idAr == 2) ? ar2 : ar1;

  if (!arConfigurado(arAlvo)) {
    server.send(409, "application/json", "{\"erro\":\"Ar ainda nao aprendido via IR\"}");
    return;
  }

  if (doc["ligar"].is<bool>()) arAlvo.next.power = doc["ligar"].as<bool>();
  if (doc["temperatura"].is<float>()) arAlvo.next.degrees = constrain(doc["temperatura"].as<float>(), 16.0f, 30.0f);
  if (doc["modo"].is<const char*>()) arAlvo.next.mode = textoParaModo(doc["modo"].as<String>());
  arAlvo.next.celsius = true;

  if (enviarAr(arAlvo)) {
    Serial.printf("[HTTP] Comando enviado ao Ar %d com sucesso.\n", idAr);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    Serial.printf("[ERRO] Falha ao disparar IR do Ar %d.\n", idAr);
    server.send(500, "application/json", "{\"erro\":\"falha ao enviar sinal IR\"}");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n--- INICIALIZANDO ESP32 SISTEMA DE AUTOMAÇÃO ---");

  pinMode(PIN_RELE_LUZ, OUTPUT);
  pinMode(PIN_TRANCA, OUTPUT);
  pinMode(PIN_PIR, INPUT);

  irrecv.enableIRIn();

  setLuz(false);
  setTranca(false);

  // Carregar Protocolos Armazenados na Flash
  prefs.begin("ar", true);
  ar1.next.protocol = (decode_type_t)prefs.getInt("prot1", (int)decode_type_t::UNKNOWN);
  ar1.next.model = prefs.getShort("mod1", -1);
  ar2.next.protocol = (decode_type_t)prefs.getInt("prot2", (int)decode_type_t::UNKNOWN);
  ar2.next.model = prefs.getShort("mod2", -1);
  prefs.end();

  // Ajustes iniciais padrão dos aparelhos
  ar1.next.power = false; ar1.next.mode = stdAc::opmode_t::kCool; ar1.next.degrees = 23; ar1.next.celsius = true;
  ar2.next.power = false; ar2.next.mode = stdAc::opmode_t::kCool; ar2.next.degrees = 23; ar2.next.celsius = true;

  Serial.print("Ar 01 configurado: "); Serial.println(arConfigurado(ar1) ? typeToString(ar1.next.protocol) : "Não");
  Serial.print("Ar 02 configurado: "); Serial.println(arConfigurado(ar2) ? typeToString(ar2.next.protocol) : "Não");

  // Conexão Wi-Fi resiliente
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid, password);

  Serial.print("Conectando ao Wi-Fi '");
  Serial.print(ssid);
  Serial.print("'");

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) { // Timeout de 10s no boot
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Conectado com sucesso!");
    Serial.print("[Wi-Fi] ENDEREÇO IP DO ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[AVISO] Não foi possível conectar ao Wi-Fi na inicialização. O sistema tentará reconectar em segundo plano.");
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
  Serial.println("[HTTP] Servidor Web pronto para receber requisições.");
}

void loop() {
  gerenciarConexaoWiFi();
  server.handleClient();
  verificarReceptorIR();
}
