import type { Invoice, Settings } from "../../../shared/types";
import { buildInvoicePdf } from "./invoice";

export { buildInvoicePdf };

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
