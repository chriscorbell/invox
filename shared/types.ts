export interface Settings {
  fromLines: string[];
  achLines: string[];
  footerNotes: string[];
  filenamePrefix: string;
}

export interface Client {
  id: number;
  name: string;
  slug: string;
  email: string;
  notes: string;
  createdAt: string;
}

export interface LineItem {
  title: string;
  description: string;
  amount: number;
}

export type InvoiceStatus = "draft" | "sent" | "paid";

export interface Invoice {
  id: number;
  number: string;
  date: string;
  clientId: number;
  clientName: string;
  clientSlug: string;
  status: InvoiceStatus;
  items: LineItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceInput = Pick<Invoice, "number" | "date" | "clientId" | "status" | "items">;
export type ClientInput = Pick<Client, "name" | "slug" | "email" | "notes">;

export const DEFAULT_SETTINGS: Settings = {
  fromLines: [],
  achLines: [],
  footerNotes: ["Thank you for your business. Please reach out with any questions."],
  filenamePrefix: "CC-Invoice",
};
