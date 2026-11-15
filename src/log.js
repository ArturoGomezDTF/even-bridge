"use strict";

// Logs a stdout/stderr; journald (systemd) agrega timestamps y rotación.
const fmt = (lvl, args) => [`[${lvl}]`, ...args];
module.exports = {
  info: (...a) => console.log(...fmt("INFO", a)),
  warn: (...a) => console.warn(...fmt("WARN", a)),
  error: (...a) => console.error(...fmt("ERROR", a)),
};
