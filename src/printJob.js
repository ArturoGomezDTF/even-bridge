"use strict";

const { buildTicket } = require("./escpos");
const transport = require("./transport");
const log = require("./log");

// clasificacion (viene enriquecida del backend) -> roles de impresora destino.
function rolesForClasificacion(clasificacion) {
  switch (Number(clasificacion)) {
    case 1:
      return ["kitchen", "all"];
    case 2:
      return ["bar", "all"];
    case 3:
      return ["other", "all"];
    default:
      return ["all"];
  }
}

// Imprime un print_job en todas las impresoras activas que correspondan.
// Rechaza si NO se pudo imprimir en alguna (el caller no manda ACK y el
// backend reintenta). Si no hay impresoras configuradas también rechaza: un
// ACK sin imprimir perdería la comanda.
async function printJob({ items, orderInfo }, printers, send = transport.send) {
  const active = (printers || []).filter((p) => p.is_active !== false);
  if (active.length === 0) throw new Error("Sin impresoras configuradas");

  const byRole = new Map();
  for (const item of items || []) {
    for (const role of rolesForClasificacion(item.clasificacion)) {
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role).push({
        nombre: item.name,
        cantidad: item.quantity,
        custom_fields: item.custom_fields || null,
        special_instructions: item.special_instructions || null,
      });
    }
  }

  const failures = [];
  let printed = 0;
  for (const printer of active) {
    const role = printer.role || "all";
    const printerItems = byRole.get(role) || [];
    if (printerItems.length === 0) continue;
    const ticket = buildTicket({
      identifier: orderInfo?.identifier || "Orden",
      items: printerItems,
      notas: orderInfo?.notes ?? "",
      folio: orderInfo?.folio ?? null,
      orderedBy: orderInfo?.orderedBy ?? null,
    });
    const label = printer.name || printer.ip || printer.usb_device_name;
    try {
      await send(printer, ticket);
      printed++;
      log.info(`print_job impreso en ${label} (${role})`);
    } catch (err) {
      log.error(`Error imprimiendo en ${label}: ${err.message}`);
      failures.push(label);
    }
  }
  if (failures.length) {
    throw new Error(`Fallo en impresoras: ${failures.join(", ")}`);
  }
  return printed;
}

module.exports = { printJob, rolesForClasificacion };
