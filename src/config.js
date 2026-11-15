"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Prioridad: variables de entorno > config.json (EVEN_BRIDGE_CONFIG o ./config.json).
function loadConfig(env = process.env) {
  const file = env.EVEN_BRIDGE_CONFIG || path.join(process.cwd(), "config.json");
  let fromFile = {};
  if (fs.existsSync(file)) {
    fromFile = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  const cfg = {
    backendUrl: env.EVEN_BACKEND_URL || fromFile.backendUrl,
    branchId: env.EVEN_BRANCH_ID || fromFile.branchId,
    token: env.EVEN_BRIDGE_TOKEN || fromFile.token,
  };
  const missing = Object.entries(cfg)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Falta configuración: ${missing.join(", ")}`);
  }
  cfg.backendUrl = cfg.backendUrl.replace(/\/+$/, "");
  return cfg;
}

module.exports = { loadConfig };
