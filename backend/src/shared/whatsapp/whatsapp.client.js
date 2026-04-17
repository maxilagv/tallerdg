const fs = require("fs");
const path = require("path");
const qrcodeTerminal = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const logger = require("../logger");

let client = null;
let estado = "desconectado";
let qrCode = null;
let qrUpdatedAt = null;
let qrVersion = 0;
let lastError = null;
let isInitializing = false;
let manualDisconnect = false;
let browserPath = null;
let retryTimeout = null;

function setEstado(nextEstado) {
  estado = nextEstado;
}

function clearRetryTimeout() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
}

function resetRuntimeState(nextEstado = "desconectado") {
  clearRetryTimeout();
  client = null;
  isInitializing = false;
  qrCode = null;
  qrUpdatedAt = null;
  setEstado(nextEstado);
}

function resolveBrowserExecutablePath() {
  const envCandidates = [
    process.env.WHATSAPP_BROWSER_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
  ].filter(Boolean);

  const platformCandidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/snap/bin/chromium",
            "/usr/bin/microsoft-edge",
          ];

  const candidates = [...envCandidates, ...platformCandidates];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function createClient() {
  browserPath = resolveBrowserExecutablePath();

  const puppeteerConfig = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  };

  if (browserPath) {
    puppeteerConfig.executablePath = browserPath;
  }

  return new Client({
    authStrategy: new LocalAuth({ dataPath: path.resolve(__dirname, "../../../whatsapp-session") }),
    puppeteer: puppeteerConfig,
  });
}

function scheduleReconnect(reason) {
  if (manualDisconnect) {
    return;
  }

  clearRetryTimeout();
  retryTimeout = setTimeout(() => {
    inicializar().catch((error) => {
      logger.warn({ error: error.message, reason }, "No se pudo reintentar la conexion de WhatsApp");
    });
  }, 5_000);
}

function bindEvents(instance) {
  instance.on("qr", (qr) => {
    qrCode = qr;
    qrUpdatedAt = new Date().toISOString();
    qrVersion += 1;
    isInitializing = false;
    lastError = null;
    setEstado("qr");
    qrcodeTerminal.generate(qr, { small: true });
    logger.info({ qrVersion, qrUpdatedAt }, "WhatsApp QR generado");
  });

  instance.on("loading_screen", (percent, message) => {
    logger.info({ percent, message }, "WhatsApp cargando");
  });

  instance.on("authenticated", () => {
    lastError = null;
    logger.info("WhatsApp autenticado");
  });

  instance.on("ready", () => {
    qrCode = null;
    qrUpdatedAt = null;
    setEstado("conectado");
    lastError = null;
    isInitializing = false;
    clearRetryTimeout();
    logger.info({ browserPath }, "WhatsApp conectado");
  });

  instance.on("disconnected", (reason) => {
    logger.warn({ reason }, "WhatsApp desconectado");
    resetRuntimeState("desconectado");
    scheduleReconnect(reason);
  });

  instance.on("auth_failure", async (message) => {
    lastError = message;
    logger.error({ message }, "WhatsApp auth failure");

    try {
      await instance.destroy();
    } catch (error) {
      logger.warn({ error: error.message }, "No se pudo destruir la sesion despues del auth failure");
    }

    resetRuntimeState("error");
    scheduleReconnect("auth_failure");
  });

  instance.on("change_state", (nextState) => {
    logger.info({ nextState }, "WhatsApp cambio de estado");
  });
}

async function inicializar() {
  if (client || isInitializing) {
    return getEstado();
  }

  isInitializing = true;
  manualDisconnect = false;
  lastError = null;
  clearRetryTimeout();
  setEstado("inicializando");

  client = createClient();
  bindEvents(client);

  client.initialize().catch((error) => {
    lastError = error.message;
    logger.error({ error, browserPath }, "Error al inicializar WhatsApp");
    resetRuntimeState("error");
    scheduleReconnect("initialize_error");
  });

  return getEstado();
}

async function desconectar() {
  manualDisconnect = true;
  clearRetryTimeout();

  if (client) {
    try {
      await client.destroy();
    } catch (error) {
      logger.warn({ error: error.message }, "No se pudo destruir la sesion de WhatsApp");
    }
  }

  resetRuntimeState("desconectado");
  return getEstado();
}

async function reiniciar() {
  await desconectar();
  manualDisconnect = false;
  return inicializar();
}

async function enviarMensaje(telefono, mensaje) {
  if (!client || estado !== "conectado") {
    throw new Error("WhatsApp no esta conectado.");
  }

  const numero = String(telefono || "").replace(/\D/g, "");
  const formateado = numero.startsWith("549")
    ? numero
    : numero.startsWith("54")
      ? numero
      : `549${numero.startsWith("0") ? numero.slice(1) : numero}`;

  const numberId = await client.getNumberId(formateado);
  if (!numberId) {
    throw new Error(`El numero ${formateado} no esta registrado en WhatsApp.`);
  }

  await client.sendMessage(numberId._serialized, mensaje);
}

function getEstado() {
  return {
    estado,
    qrCode,
    qrUpdatedAt,
    qrVersion,
    lastError,
    browserPath,
  };
}

module.exports = {
  inicializar,
  desconectar,
  reiniciar,
  enviarMensaje,
  getEstado,
};
