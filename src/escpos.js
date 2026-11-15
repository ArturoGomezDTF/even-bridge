"use strict";

// Armado de tickets ESC/POS. Portado de even-agent/src/printing.js (sin logo
// ni dependencias de Electron/SQL) para que el ticket sea idéntico.

const ESC = 0x1b;
const GS = 0x1d;
const SEPARATOR = "========================";

const init = () => Buffer.from([ESC, 0x40]);
const alignLeft = () => Buffer.from([ESC, 0x61, 0x00]);
const alignCenter = () => Buffer.from([ESC, 0x61, 0x01]);
const doubleSize = () => Buffer.from([ESC, 0x21, 0x30]);
const normalSize = () => Buffer.from([ESC, 0x21, 0x00]);
const ascii = (s) => Buffer.from(sinAcentos(s), "ascii");

// La impresora va en ASCII: "López" saldría con basura en la "ó".
function sinAcentos(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e\n]/g, "");
}

function formatFolio(folio) {
  if (folio == null || folio === "") return "";
  const s = String(folio);
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, "") : s;
}

function getLocationKind(identifier) {
  if (/habitaci[oó]n|cuarto/i.test(identifier)) return "room";
  if (/^mesa\b/i.test(identifier)) return "table";
  if (/pick/i.test(identifier)) return "pick";
  return "other";
}

function parseLocationCode(identifier) {
  const m = identifier.match(/^(mesa|habitaci[oó]n|cuarto)\s+(.+)$/i);
  if (!m) return null;
  return m[2].split(" - ")[0].trim() || null;
}

const padLocationCode = (code) =>
  /^\d+$/.test(code) ? code.padStart(2, "0") : code;

const pad2 = (n) => String(n).padStart(2, "0");

function buildTicket({
  identifier,
  items,
  notas,
  folio,
  orderedBy = null,
  now = new Date(),
}) {
  const fecha =
    `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()} ` +
    `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

  const kind = getLocationKind(identifier);
  const code = parseLocationCode(identifier);
  const buf = [init(), ascii("\n"), alignCenter(), doubleSize()];

  const headerLabel = code
    ? kind === "room"
      ? `HABITACION ${padLocationCode(code)}`
      : kind === "pick"
        ? identifier.toUpperCase()
        : `MESA ${padLocationCode(code)}`
    : identifier.toUpperCase();
  buf.push(ascii(`${headerLabel}\n`));
  if (orderedBy) buf.push(ascii(`${orderedBy.toUpperCase()}\n`));

  buf.push(alignLeft(), Buffer.from([GS, 0x21, 0x01]));
  buf.push(ascii(`\nNUMERO DE ORDEN: ${formatFolio(folio)}\n`));
  buf.push(ascii(`${fecha}\n`));

  if (code) {
    if (kind === "room") {
      buf.push(ascii(`HABITACION: ${padLocationCode(code)} MESERO: EVEN\n\n`));
    } else if (kind === "pick") {
      buf.push(ascii("MESERO: EVEN\n\n"));
    } else {
      buf.push(ascii(`MESA: ${padLocationCode(code)} MESERO: EVEN\n\n`));
    }
  } else {
    buf.push(ascii(`${identifier.toUpperCase()} MESERO: EVEN\n\n`));
  }

  buf.push(ascii(`${SEPARATOR}\n`));
  if (notas && notas.trim()) {
    buf.push(ascii(`COMENTARIO: ${notas.trim().toUpperCase()}\n`));
    buf.push(ascii(`${SEPARATOR}\n`));
  }

  items.forEach((item, index) => {
    if (index > 0) buf.push(Buffer.from([ESC, 0x4a, 0x10]));
    const qty = Math.round(Number(item.cantidad));
    buf.push(ascii(`${qty} ${String(item.nombre || "???").toUpperCase()}\n`));
    for (const field of item.custom_fields || []) {
      const opts = (field.selectedOptions || [])
        .map((o) => o.optionName)
        .join(", ");
      if (opts) buf.push(ascii(`  ${field.fieldName}: ${opts}\n`));
    }
    if (item.special_instructions) {
      buf.push(ascii(`  Nota: ${item.special_instructions}\n`));
    }
  });

  buf.push(ascii(`${SEPARATOR}\n`), normalSize(), alignCenter());
  buf.push(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, GS, 0x56, 0x00]));
  return Buffer.concat(buf);
}

module.exports = { buildTicket, formatFolio, sinAcentos };
