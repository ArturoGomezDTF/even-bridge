"use strict";

const net = require("node:net");
const fs = require("node:fs/promises");

const DEFAULT_PORT = 9100;
const TIMEOUT_MS = 5000;

// Envía bytes ESC/POS a una impresora de red (RAW, puerto 9100).
function sendTcp(ip, port, data, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      socket.destroy();
      err ? reject(err) : resolve();
    };
    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => finish(new Error(`Timeout en ${ip}:${port}`)));
    socket.on("error", finish);
    socket.connect(port, ip, () => socket.write(data, () => finish()));
  });
}

// Impresora USB en Linux: dispositivo /dev/usb/lpN (driver usblp).
// `usb_device_name` en branch_printers debe ser esa ruta.
async function sendUsb(devicePath, data) {
  if (!/^\/dev\/usb\/lp\d+$/.test(devicePath)) {
    throw new Error(`Dispositivo USB no válido: ${devicePath}`);
  }
  await fs.writeFile(devicePath, data);
}

async function send(printer, data) {
  if (printer.connection_type === "usb" && printer.usb_device_name) {
    return sendUsb(printer.usb_device_name, data);
  }
  if (!printer.ip) throw new Error("Impresora sin ip");
  return sendTcp(printer.ip, printer.port || DEFAULT_PORT, data);
}

module.exports = { send, sendTcp, sendUsb, DEFAULT_PORT };
