#!/usr/bin/env node
"use strict";

const { loadConfig } = require("./config");
const { connect } = require("./client");
const log = require("./log");

try {
  const cfg = loadConfig();
  log.info(`Even Bridge → ${cfg.backendUrl} (branch ${cfg.branchId})`);
  connect(cfg);
} catch (err) {
  log.error(err.message);
  process.exit(1);
}
