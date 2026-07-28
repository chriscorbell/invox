// Invoice document: monochrome, generous whitespace, tracked small-caps labels,
// and monospaced figures so columns align. Content flows and paginates.
import fontkit from "@pdf-lib/fontkit";
import { rgb, type PDFFont, type PDFImage } from "pdf-lib";
import type { Invoice, Settings } from "../../../shared/types";
import { longDate, usd } from "../format";
import geistRegularUrl from "@/assets/fonts/Geist-Regular.ttf?url";
import geistSemiBoldUrl from "@/assets/fonts/Geist-SemiBold.ttf?url";
import monoRegularUrl from "@/assets/fonts/JetBrainsMono-Regular.ttf?url";
import monoSemiBoldUrl from "@/assets/fonts/JetBrainsMono-SemiBold.ttf?url";
import { CONTENT_W, Layout, MARGIN, RIGHT, wrap, widthOf, type TextOpts } from "./layout";

const ink = rgb(0.07, 0.07, 0.08);
const muted = rgb(0.45, 0.46, 0.49);
const hairline = rgb(0.87, 0.88, 0.89);

const LOGO_MAX_H = 30;
const LOGO_MAX_W = 190;
/** Right-hand money column. */
const AMOUNT_W = 90;
const DESC_W = CONTENT_W - AMOUNT_W - 16;

let fontCache: Promise<Record<string, ArrayBuffer>> | null = null;

function loadFontBytes() {
  fontCache ??= (async () => {
    const urls = {
      sans: geistRegularUrl,
      sansBold: geistSemiBoldUrl,
      mono: monoRegularUrl,
      monoBold: monoSemiBoldUrl,
    };
    const entries = await Promise.all(
      Object.entries(urls).map(async ([k, url]) => [k, await (await fetch(url)).arrayBuffer()] as const),
    );
    return Object.fromEntries(entries);
  })();
  return fontCache;
}

interface Fonts {
  sans: PDFFont;
  sansBold: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
}

export async function buildInvoicePdf(invoice: Invoice, settings: Settings): Promise<Uint8Array> {
  const l = await Layout.create();
  l.doc.registerFontkit(fontkit);
  l.doc.setTitle(`Invoice ${invoice.number} - ${invoice.clientName}`);
  l.doc.setCreator("invox");

  const bytes = await loadFontBytes();
  const f: Fonts = {
    sans: await l.doc.embedFont(bytes.sans, { subset: true }),
    sansBold: await l.doc.embedFont(bytes.sansBold, { subset: true }),
    mono: await l.doc.embedFont(bytes.mono, { subset: true }),
    monoBold: await l.doc.embedFont(bytes.monoBold, { subset: true }),
  };

  const label: TextOpts = { font: f.mono, size: 6.5, color: muted, tracking: 1.1 };
  const body: TextOpts = { font: f.sans, size: 9.5, color: ink };
  const bodyMuted: TextOpts = { font: f.sans, size: 9.5, color: muted };
  const itemTitle: TextOpts = { font: f.sansBold, size: 10, color: ink };
  const figure: TextOpts = { font: f.mono, size: 9.5, color: ink };

  const logo = await embedLogo(l, settings.logo);

  drawHeader(l, f, invoice, logo, label, settings.fromLines[0] ?? "");
  drawParties(l, invoice, settings, !logo, label, body, bodyMuted);
  drawItems(l, f, invoice, label, itemTitle, bodyMuted, figure);
  drawTotals(l, f, invoice, label);
  drawFooter(l, f, settings, label, bodyMuted);
  drawPageNumbers(l, f);

  return l.doc.save();
}

async function embedLogo(l: Layout, logo: string | null | undefined): Promise<PDFImage | null> {
  if (!logo) return null;
  try {
    const image = logo.startsWith("data:image/png")
      ? await l.doc.embedPng(logo)
      : await l.doc.embedJpg(logo);
    return image;
  } catch {
    return null; // a corrupt logo must never block the invoice
  }
}

function logoBox(image: PDFImage) {
  const scale = Math.min(LOGO_MAX_W / image.width, LOGO_MAX_H / image.height, 1);
  return { width: image.width * scale, height: image.height * scale };
}

function drawHeader(
  l: Layout,
  f: Fonts,
  invoice: Invoice,
  logo: PDFImage | null,
  label: TextOpts,
  wordmark: string,
) {
  const top = l.y;

  if (logo) {
    const { width, height } = logoBox(logo);
    l.page.drawImage(logo, { x: MARGIN, y: top - height, width, height });
  } else if (wordmark) {
    // Without a logo the header would be lopsided, so set the name as a wordmark.
    l.y = top - 15;
    l.text(wordmark, MARGIN, { font: f.sansBold, size: 13, color: ink });
    l.y = top;
  }

  // Right-aligned meta stack, baseline-aligned with the top of the logo.
  l.y = top - 7;
  l.textRight("INVOICE", RIGHT, label);
  l.y -= 17;
  l.textRight(invoice.number, RIGHT, { font: f.monoBold, size: 15, color: ink });

  const headerBottom = logo ? Math.min(top - logoBox(logo).height, l.y) : Math.min(top - 15, l.y);
  l.y = headerBottom - 26;
  l.rule(hairline);
  l.y -= 26;
}

function drawParties(
  l: Layout,
  invoice: Invoice,
  settings: Settings,
  wordmarkShown: boolean,
  label: TextOpts,
  body: TextOpts,
  bodyMuted: TextOpts,
) {
  const colW = CONTENT_W / 3 - 12;
  const cols = [MARGIN, MARGIN + CONTENT_W / 3, MARGIN + (CONTENT_W / 3) * 2];
  const top = l.y;

  // The wordmark already shows the first line, so don't repeat it here.
  const allFrom = settings.fromLines;
  const from = wordmarkShown && allFrom.length > 1 ? allFrom.slice(1) : allFrom;
  const billed = [invoice.clientName];
  const issued = [longDate(invoice.date)];

  const columns: Array<{ heading: string; lines: string[] }> = [
    { heading: "FROM", lines: from },
    { heading: "BILLED TO", lines: billed },
    { heading: "ISSUED", lines: issued },
  ];

  let deepest = top;
  columns.forEach((col, i) => {
    l.y = top;
    l.text(col.heading, cols[i], label);
    l.y -= 15;
    col.lines.forEach((line, j) => {
      const opts = i === 0 && (wordmarkShown || j > 0) ? bodyMuted : body;
      const used = l.paragraph(line, cols[i], colW, opts, 12.5);
      l.y -= used > 0 ? 13 : 0;
    });
    deepest = Math.min(deepest, l.y);
  });

  l.y = deepest - 14;
}

function drawItemsHeader(l: Layout, label: TextOpts) {
  l.rule(ink, 0.9);
  l.y -= 13;
  l.text("DESCRIPTION", MARGIN, label);
  l.textRight("AMOUNT", RIGHT, label);
  l.y -= 9;
  l.rule(hairline);
  l.y -= 19;
}

function drawItems(
  l: Layout,
  f: Fonts,
  invoice: Invoice,
  label: TextOpts,
  itemTitle: TextOpts,
  bodyMuted: TextOpts,
  figure: TextOpts,
) {
  drawItemsHeader(l, label);
  // Continuation pages repeat the column header so amounts stay readable.
  l.onNewPage = (layout) => {
    layout.y -= 4;
    layout.text(invoice.number, MARGIN, { font: f.mono, size: 7, color: muted });
    layout.textRight("CONTINUED", RIGHT, label);
    layout.y -= 18;
    drawItemsHeader(layout, label);
  };

  for (const item of invoice.items) {
    const titleLines = wrap(item.title, DESC_W, itemTitle);
    const descLines = wrap(item.description, DESC_W, bodyMuted);
    const height = titleLines.length * 13 + (descLines.length ? descLines.length * 12.5 + 3 : 0) + 20;
    l.ensure(height); // keep each item whole

    const amountY = l.y;
    titleLines.forEach((line, i) => {
      if (i > 0) l.y -= 13;
      l.text(line, MARGIN, itemTitle);
    });

    const saved = l.y;
    l.y = amountY;
    l.textRight(usd(item.amount), RIGHT, figure);
    l.y = saved;

    if (descLines.length) {
      l.y -= 3;
      descLines.forEach((line) => {
        l.y -= 12.5;
        l.text(line, MARGIN, bodyMuted);
      });
    }

    l.y -= 14;
    l.rule(hairline);
    l.y -= 20;
  }

  l.onNewPage = undefined;
}

function drawTotals(l: Layout, f: Fonts, invoice: Invoice, label: TextOpts) {
  const paid = invoice.status === "paid";
  l.ensure(paid ? 76 : 58);

  const colX = MARGIN + CONTENT_W * 0.55;
  l.y -= 2;
  l.text(paid ? "AMOUNT PAID" : "AMOUNT DUE", colX, label);
  l.textRight(usd(invoice.total), RIGHT, { font: f.monoBold, size: 15, color: ink });
  l.y -= 12;
  l.rule(ink, 0.9, colX, RIGHT);

  if (paid) {
    l.y -= 14;
    l.textRight("Paid in full. Thank you.", RIGHT, { font: f.sans, size: 8.5, color: muted });
  }
  l.y -= 34;
}

function drawFooter(
  l: Layout,
  f: Fonts,
  settings: Settings,
  label: TextOpts,
  bodyMuted: TextOpts,
) {
  const pay = settings.achLines;
  const notes = settings.footerNotes;
  if (pay.length === 0 && notes.length === 0) return;

  const payHeight = pay.length ? 15 + pay.length * 13 : 0;
  const notesHeight = notes.length ? 18 + notes.length * 12 : 0;
  const block = payHeight + notesHeight + 10;

  const pageBefore = l.pages.length;
  l.ensure(block);
  // On a short invoice, anchor the block near the foot so the page reads as
  // composed rather than top-heavy. If it had to break to a fresh page, leave
  // it at the top instead, so that page doesn't read as blank.
  const brokePage = l.pages.length > pageBefore;
  if (!brokePage && l.remaining > block + 90) l.y = MARGIN + block - 6;

  if (pay.length) {
    l.text("PAYMENT BY ACH TRANSFER", MARGIN, label);
    l.y -= 15;
    pay.forEach((line, i) => {
      if (i > 0) l.y -= 13;
      l.text(line, MARGIN, { font: f.mono, size: 8.5, color: ink });
    });
  }

  if (notes.length) {
    l.y -= pay.length ? 22 : 0;
    notes.forEach((line, i) => {
      if (i > 0) l.y -= 12;
      l.paragraph(line, MARGIN, CONTENT_W, { ...bodyMuted, size: 8.5 }, 12);
    });
  }
}

function drawPageNumbers(l: Layout, f: Fonts) {
  if (l.pages.length < 2) return;
  const opts: TextOpts = { font: f.mono, size: 7, color: muted };
  l.pages.forEach((page, i) => {
    const text = `${i + 1} / ${l.pages.length}`;
    page.drawText(text, {
      x: RIGHT - widthOf(text, opts),
      y: MARGIN - 12,
      font: opts.font,
      size: opts.size,
      color: opts.color,
    });
  });
}
