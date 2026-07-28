import type { Client, ClientInput, Invoice, InvoiceInput, Settings } from "../../shared/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  settings: {
    get: () => request<Settings>("/settings"),
    update: (s: Settings) => request<Settings>("/settings", { method: "PUT", body: JSON.stringify(s) }),
  },
  clients: {
    list: () => request<Client[]>("/clients"),
    create: (c: ClientInput) => request<Client>("/clients", { method: "POST", body: JSON.stringify(c) }),
    update: (id: number, c: ClientInput) =>
      request<Client>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(c) }),
    remove: (id: number) => request<void>(`/clients/${id}`, { method: "DELETE" }),
  },
  invoices: {
    list: () => request<Invoice[]>("/invoices"),
    get: (id: number | string) => request<Invoice>(`/invoices/${id}`),
    nextNumber: () => request<{ number: string }>("/invoices/next-number"),
    create: (i: InvoiceInput) => request<Invoice>("/invoices", { method: "POST", body: JSON.stringify(i) }),
    update: (id: number, i: InvoiceInput) =>
      request<Invoice>(`/invoices/${id}`, { method: "PUT", body: JSON.stringify(i) }),
    remove: (id: number) => request<void>(`/invoices/${id}`, { method: "DELETE" }),
  },
};
