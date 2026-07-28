import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { db } from "./db.ts";
import {
  DEFAULT_SETTINGS,
  type ClientInput,
  type Invoice,
  type InvoiceInput,
  type LineItem,
  type Settings,
} from "../shared/types.ts";

const app = new Hono();
const api = new Hono();

// --- settings ---

api.get("/settings", (c) => {
  const row = db.prepare("SELECT json FROM settings WHERE id = 1").get() as { json: string } | undefined;
  return c.json(row ? { ...DEFAULT_SETTINGS, ...JSON.parse(row.json) } : DEFAULT_SETTINGS);
});

api.put("/settings", async (c) => {
  const body = (await c.req.json()) as Settings;
  db.prepare(
    "INSERT INTO settings (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json",
  ).run(JSON.stringify(body));
  return c.json(body);
});

// --- clients ---

api.get("/clients", (c) => {
  const rows = db.prepare("SELECT * FROM clients ORDER BY name COLLATE NOCASE").all();
  return c.json(rows.map(clientFromRow));
});

api.post("/clients", async (c) => {
  const body = (await c.req.json()) as ClientInput;
  if (!body.name?.trim()) return c.json({ error: "Name is required" }, 400);
  const info = db
    .prepare("INSERT INTO clients (name, slug, email, notes) VALUES (?, ?, ?, ?)")
    .run(body.name.trim(), slugOf(body), body.email ?? "", body.notes ?? "");
  return c.json(clientFromRow(db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid)), 201);
});

api.put("/clients/:id", async (c) => {
  const body = (await c.req.json()) as ClientInput;
  if (!body.name?.trim()) return c.json({ error: "Name is required" }, 400);
  db.prepare("UPDATE clients SET name = ?, slug = ?, email = ?, notes = ? WHERE id = ?").run(
    body.name.trim(),
    slugOf(body),
    body.email ?? "",
    body.notes ?? "",
    c.req.param("id"),
  );
  return c.json(clientFromRow(db.prepare("SELECT * FROM clients WHERE id = ?").get(c.req.param("id"))));
});

api.delete("/clients/:id", (c) => {
  const used = db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE client_id = ?").get(c.req.param("id")) as {
    n: number;
  };
  if (used.n > 0) return c.json({ error: `Client has ${used.n} invoice(s)` }, 409);
  db.prepare("DELETE FROM clients WHERE id = ?").run(c.req.param("id"));
  return c.body(null, 204);
});

// --- invoices ---

const invoiceSelect = `
  SELECT i.*, cl.name AS client_name, cl.slug AS client_slug
  FROM invoices i JOIN clients cl ON cl.id = i.client_id
`;

api.get("/invoices", (c) => {
  const rows = db.prepare(`${invoiceSelect} ORDER BY i.number DESC`).all();
  return c.json(rows.map(invoiceFromRow));
});

api.get("/invoices/next-number", (c) => {
  const year = new Date().getFullYear();
  const row = db
    .prepare("SELECT number FROM invoices WHERE number LIKE ? ORDER BY number DESC LIMIT 1")
    .get(`${year}-%`) as { number: string } | undefined;
  const seq = row ? parseInt(row.number.slice(5), 10) + 1 : 1;
  return c.json({ number: `${year}-${String(seq).padStart(4, "0")}` });
});

api.get("/invoices/:id", (c) => {
  const row = db.prepare(`${invoiceSelect} WHERE i.id = ?`).get(c.req.param("id"));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(invoiceFromRow(row));
});

api.post("/invoices", async (c) => {
  const body = (await c.req.json()) as InvoiceInput;
  const err = validateInvoice(body);
  if (err) return c.json({ error: err }, 400);
  try {
    const info = db
      .prepare("INSERT INTO invoices (number, date, client_id, status, items) VALUES (?, ?, ?, ?, ?)")
      .run(body.number.trim(), body.date, body.clientId, body.status, JSON.stringify(body.items));
    return c.json(invoiceFromRow(db.prepare(`${invoiceSelect} WHERE i.id = ?`).get(info.lastInsertRowid)), 201);
  } catch (e) {
    if (String(e).includes("UNIQUE")) return c.json({ error: `Invoice ${body.number} already exists` }, 409);
    throw e;
  }
});

api.put("/invoices/:id", async (c) => {
  const body = (await c.req.json()) as InvoiceInput;
  const err = validateInvoice(body);
  if (err) return c.json({ error: err }, 400);
  try {
    db.prepare(
      "UPDATE invoices SET number = ?, date = ?, client_id = ?, status = ?, items = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(body.number.trim(), body.date, body.clientId, body.status, JSON.stringify(body.items), c.req.param("id"));
  } catch (e) {
    if (String(e).includes("UNIQUE")) return c.json({ error: `Invoice ${body.number} already exists` }, 409);
    throw e;
  }
  return c.json(invoiceFromRow(db.prepare(`${invoiceSelect} WHERE i.id = ?`).get(c.req.param("id"))));
});

api.delete("/invoices/:id", (c) => {
  db.prepare("DELETE FROM invoices WHERE id = ?").run(c.req.param("id"));
  return c.body(null, 204);
});

app.route("/api", api);

// --- static frontend (production) ---

app.use("*", serveStatic({ root: "./dist" }));
app.use("*", serveStatic({ root: "./dist", path: "index.html" }));

// --- helpers ---

function slugOf(body: ClientInput): string {
  const slug = (body.slug ?? "").trim() || body.name.replace(/[^A-Za-z0-9]/g, "");
  return slug.replace(/[^A-Za-z0-9-]/g, "");
}

function validateInvoice(body: InvoiceInput): string | null {
  if (!body.number?.trim()) return "Invoice number is required";
  if (!body.date) return "Date is required";
  if (!body.clientId) return "Client is required";
  if (!Array.isArray(body.items) || body.items.length === 0) return "At least one line item is required";
  if (body.items.some((it: LineItem) => !it.title?.trim())) return "Every line item needs a title";
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clientFromRow(r: any) {
  return { id: r.id, name: r.name, slug: r.slug, email: r.email, notes: r.notes, createdAt: r.created_at };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function invoiceFromRow(r: any): Invoice {
  const items: LineItem[] = JSON.parse(r.items);
  return {
    id: r.id,
    number: r.number,
    date: r.date,
    clientId: r.client_id,
    clientName: r.client_name,
    clientSlug: r.client_slug,
    status: r.status,
    items,
    total: items.reduce((s, it) => s + (Number(it.amount) || 0), 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`invox api listening on :${info.port}`);
});
