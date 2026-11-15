"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { printJob, rolesForClasificacion } = require("../src/printJob");
const { buildTicket } = require("../src/escpos");

const printers = [
  { name: "Cocina", ip: "10.0.0.5", role: "kitchen" },
  { name: "Barra", ip: "10.0.0.6", role: "bar" },
];
const job = {
  items: [
    { name: "Tacos", quantity: 2, clasificacion: 1 },
    { name: "Mojito", quantity: 1, clasificacion: 2 },
  ],
  orderInfo: { identifier: "Mesa 5", folio: "016" },
};

test("roles por clasificación", () => {
  assert.deepEqual(rolesForClasificacion(1), ["kitchen", "all"]);
  assert.deepEqual(rolesForClasificacion(null), ["all"]);
});

test("cada impresora recibe solo sus items", async () => {
  const sent = [];
  await printJob(job, printers, async (p, data) => sent.push([p.name, data]));
  assert.equal(sent.length, 2);
  const cocina = sent.find(([n]) => n === "Cocina")[1].toString("ascii");
  assert.match(cocina, /2 TACOS/);
  assert.doesNotMatch(cocina, /MOJITO/);
});

test("rechaza si una impresora falla (sin ACK → reintento)", async () => {
  await assert.rejects(
    printJob(job, printers, async (p) => {
      if (p.name === "Barra") throw new Error("offline");
    }),
    /Barra/,
  );
});

test("rechaza sin impresoras (no se pierde la comanda)", async () => {
  await assert.rejects(printJob(job, [], async () => {}), /Sin impresoras/);
});

test("ticket: encabezado, folio sin ceros y ASCII", () => {
  const t = buildTicket({
    identifier: "Mesa 5",
    folio: "016",
    items: [{ nombre: "Jalapeño", cantidad: 1 }],
    now: new Date(2026, 10, 15, 10, 0, 0),
  }).toString("latin1");
  assert.match(t, /MESA 05/);
  assert.match(t, /NUMERO DE ORDEN: 16/);
  assert.match(t, /1 JALAPENO/);
});
