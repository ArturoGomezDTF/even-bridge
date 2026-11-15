"use strict";

const { io } = require("socket.io-client");
const { printJob } = require("./printJob");
const log = require("./log");
const pkg = require("../package.json");

function connect(cfg, { printJobFn = printJob } = {}) {
  let printers = [];
  const socket = io(`${cfg.backendUrl}/bridge`, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
  });

  socket.on("connect", () => {
    log.info("Conectado, registrando bridge...");
    socket.emit("register", {
      branchId: cfg.branchId,
      token: cfg.token,
      version: pkg.version,
    });
  });
  socket.on("register_ack", () => log.info("Bridge registrado"));
  socket.on("register_error", (d) => {
    // Token inválido: el backend corta la conexión; reintentar no sirve.
    log.error("Registro rechazado:", d?.error);
  });
  socket.on("printers_config", (d) => {
    printers = d?.printers || [];
    log.info(`${printers.length} impresora(s) configurada(s)`);
  });

  // Cola local en serie: un solo ticket a la vez, en orden de llegada.
  let chain = Promise.resolve();
  socket.on("print_job", (data) => {
    chain = chain.then(async () => {
      try {
        await printJobFn(data, printers);
        // ACK solo tras imprimir; sin ACK el backend reintenta.
        if (data.jobId) socket.emit("print_job_ack", { jobId: data.jobId });
      } catch (err) {
        log.error(`print_job ${data?.jobId} falló: ${err.message}`);
      }
    });
  });

  socket.on("disconnect", (reason) => log.warn("Desconectado:", reason));
  socket.on("connect_error", (e) => log.warn("Error de conexión:", e.message));

  // Keepalive de aplicación (el backend responde pong).
  const ping = setInterval(() => socket.connected && socket.emit("ping"), 25000);
  ping.unref();

  return { socket, getPrinters: () => printers };
}

module.exports = { connect };
