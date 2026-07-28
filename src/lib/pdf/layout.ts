// Minimal flowing-layout helper over pdf-lib: a downward cursor that knows how
// to wrap text, reserve space, and break to a new page. Everything above this
// works in PDF points with a bottom-left origin.
import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import { PDFDocument } from "pdf-lib";

export const PAGE_W = 612;
export const PAGE_H = 792;
export const MARGIN = 56;
export const CONTENT_W = PAGE_W - MARGIN * 2;
export const RIGHT = PAGE_W - MARGIN;

/** Space kept clear at the foot of every page for the page counter. */
const BOTTOM_LIMIT = MARGIN + 24;

export interface TextOpts {
  font: PDFFont;
  size: number;
  color: RGB;
  /** Extra space between glyphs, used for the small caps labels. */
  tracking?: number;
}

/**
 * pdf-lib throws on glyphs a subset font lacks; normalise the usual suspects.
 * Newlines survive because `wrap` splits on them; single-line draws flatten them.
 */
export function sanitize(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/\t/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "");
}

export function widthOf(text: string, o: TextOpts): number {
  const base = o.font.widthOfTextAtSize(sanitize(text), o.size);
  return o.tracking ? base + o.tracking * Math.max(0, text.length - 1) : base;
}

/** Greedy word wrap; falls back to hard character breaks for long unbroken runs. */
export function wrap(text: string, maxWidth: number, o: TextOpts): string[] {
  const out: string[] = [];
  for (const paragraph of sanitize(text).split("\n")) {
    if (paragraph.trim() === "") continue;
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (widthOf(candidate, o) <= maxWidth || !line) {
        if (widthOf(candidate, o) > maxWidth && !line) {
          let chunk = "";
          for (const ch of word) {
            if (widthOf(chunk + ch, o) > maxWidth && chunk) {
              out.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          line = chunk;
          continue;
        }
        line = candidate;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export class Layout {
  readonly doc: PDFDocument;
  readonly pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  /** Redrawn at the top of each continuation page. */
  onNewPage?: (l: Layout) => void;

  private constructor(doc: PDFDocument) {
    this.doc = doc;
  }

  static async create(): Promise<Layout> {
    const layout = new Layout(await PDFDocument.create());
    layout.addPage();
    return layout;
  }

  addPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    this.y = PAGE_H - MARGIN;
  }

  /** Break to a new page when `height` more points will not fit. */
  ensure(height: number) {
    if (this.y - height >= BOTTOM_LIMIT) return;
    this.addPage();
    this.onNewPage?.(this);
  }

  get remaining(): number {
    return this.y - BOTTOM_LIMIT;
  }

  text(text: string, x: number, o: TextOpts) {
    const clean = sanitize(text).replace(/\n/g, " ");
    if (!o.tracking) {
      this.page.drawText(clean, { x, y: this.y, font: o.font, size: o.size, color: o.color });
      return;
    }
    let cursor = x;
    for (const ch of clean) {
      this.page.drawText(ch, { x: cursor, y: this.y, font: o.font, size: o.size, color: o.color });
      cursor += o.font.widthOfTextAtSize(ch, o.size) + o.tracking;
    }
  }

  textRight(text: string, rightEdge: number, o: TextOpts) {
    this.text(text, rightEdge - widthOf(text, o), o);
  }

  /** Draws wrapped lines from the cursor, advancing it past the block. */
  paragraph(text: string, x: number, maxWidth: number, o: TextOpts, leading: number): number {
    const lines = wrap(text, maxWidth, o);
    lines.forEach((line, i) => {
      if (i > 0) this.y -= leading;
      this.text(line, x, o);
    });
    return lines.length;
  }

  rule(color: RGB, thickness = 0.5, from = MARGIN, to = RIGHT) {
    this.page.drawLine({
      start: { x: from, y: this.y },
      end: { x: to, y: this.y },
      thickness,
      color,
    });
  }
}
