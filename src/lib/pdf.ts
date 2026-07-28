// Direct port of the original reportlab invoice script. Coordinates are in PDF
// points with a bottom-left origin and baseline text positioning, so the layout
// values match the Python source exactly.
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Invoice, Settings } from "../../shared/types";
import { longDate, usd } from "./format";

const W = 612;
const H = 792;
const inch = 72;
const M = 0.9 * inch;
const right = W - M;

const ink = rgb(0x1a / 255, 0x1a / 255, 0x1a / 255);
const gray = rgb(0x6b / 255, 0x6b / 255, 0x6b / 255);
const rule = rgb(0xd8 / 255, 0xd8 / 255, 0xd8 / 255);

export async function buildInvoicePdf(invoice: Invoice, settings: Settings): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${invoice.number} — ${invoice.clientName}`);
  const page = doc.addPage([W, H]);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const text = (t: string, x: number, y: number, font: PDFFont, size: number, color = ink) =>
    page.drawText(t, { x, y, font, size, color });
  const rightText = (t: string, x: number, y: number, font: PDFFont, size: number, color = ink) =>
    text(t, x - font.widthOfTextAtSize(t, size), y, font, size, color);
  const line = (x1: number, y1: number, x2: number, y2: number, thickness: number, color: typeof ink) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });

  // Header
  text("INVOICE", M, H - 1.2 * inch, bold, 26);
  rightText(`Invoice No. ${invoice.number}`, right, H - 1.0 * inch, helv, 9.5, gray);
  rightText(`Date: ${longDate(invoice.date)}`, right, H - 1.16 * inch, helv, 9.5, gray);

  // From / Bill To
  let y = H - 1.95 * inch;
  text("FROM", M, y, bold, 8, gray);
  text("BILL TO", W / 2, y, bold, 8, gray);
  settings.fromLines.forEach((l, i) => text(l, M, y - 16 - i * 14, helv, 10));
  text(invoice.clientName, W / 2, y - 16, helv, 10);

  // Table header
  y = H - 2.9 * inch;
  line(M, y, right, y, 1, ink);
  text("DESCRIPTION", M, y - 14, bold, 8, gray);
  rightText("AMOUNT", right, y - 14, bold, 8, gray);
  line(M, y - 22, right, y - 22, 0.5, rule);

  // Line items
  y = y - 42;
  for (const item of invoice.items) {
    const descLines = item.description.split("\n").filter((l) => l.trim() !== "");
    text(item.title, M, y, bold, 10);
    rightText(usd(item.amount), right, y, helv, 10);
    descLines.forEach((l, i) => text(l, M, y - 15 - i * 14, helv, 9.5, gray));
    y -= 15 + descLines.length * 14;
    line(M, y, right, y, 0.5, rule);
    y -= 22;
  }

  // Total
  y -= 8;
  text("Total", W / 2 + 0.6 * inch, y, bold, 12);
  rightText(usd(invoice.total), right, y, bold, 12);
  line(W / 2 + 0.6 * inch, y - 10, right, y - 10, 1, ink);

  // Payment details
  if (settings.achLines.length > 0) {
    const py = 2.9 * inch;
    text("PAYMENT BY ACH TRANSFER", M, py, bold, 8, gray);
    settings.achLines.forEach((l, i) => text(l, M, py - 16 - i * 14, helv, 9.5));
  }

  // Footer notes
  settings.footerNotes.forEach((l, i) => text(l, M, 1.5 * inch - i * 14, helv, 9, gray));

  return doc.save();
}

export async function downloadInvoicePdf(invoice: Invoice, settings: Settings) {
  const bytes = await buildInvoicePdf(invoice, settings);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${settings.filenamePrefix}-${invoice.number}-${invoice.clientSlug}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
