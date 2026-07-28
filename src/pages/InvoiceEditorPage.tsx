import { ArrowLeft, Download, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { InvoiceInput, InvoiceStatus, LineItem } from "../../shared/types";
import HoldButton from "@/components/kokonutui/hold-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { putResource, useResource } from "@/lib/use-resource";
import { todayISO, usd } from "@/lib/format";

interface EditableItem {
  title: string;
  description: string;
  amount: string;
}

const emptyItem: EditableItem = { title: "", description: "", amount: "" };

export default function InvoiceEditorPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const navigate = useNavigate();

  const { data: clients } = useResource("clients", api.clients.list);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [clientId, setClientId] = useState<number | null>(null);
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [items, setItems] = useState<EditableItem[]>([{ ...emptyItem }]);

  useEffect(() => {
    if (isNew) {
      api.invoices
        .nextNumber()
        .then(({ number }) => setNumber((n) => n || number))
        .catch(() => {});
    } else {
      api.invoices
        .get(id)
        .then((inv) => {
          setNumber(inv.number);
          setDate(inv.date);
          setClientId(inv.clientId);
          setStatus(inv.status);
          setItems(
            inv.items.map((it) => ({
              title: it.title,
              description: it.description,
              amount: it.amount === 0 ? "" : it.amount.toFixed(2),
            })),
          );
          setLoading(false);
        })
        .catch((e) => {
          toast.error(e.message);
          navigate("/");
        });
    }
  }, [id, isNew, navigate]);

  const total = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function toInput(): InvoiceInput | null {
    if (!clientId) {
      toast.error("Pick a client first");
      return null;
    }
    const lineItems: LineItem[] = items
      .filter((it) => it.title.trim() || it.description.trim() || it.amount.trim())
      .map((it) => ({
        title: it.title.trim(),
        description: it.description,
        amount: parseFloat(it.amount) || 0,
      }));
    if (lineItems.length === 0) {
      toast.error("Add at least one line item");
      return null;
    }
    return { number: number.trim(), date, clientId, status, items: lineItems };
  }

  /** Refresh the cached list so navigating back shows the change immediately. */
  function syncInvoicesCache() {
    void api.invoices.list().then((list) => putResource("invoices", list));
  }

  async function save(): Promise<number | null> {
    const input = toInput();
    if (!input) return null;
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.invoices.create(input);
        syncInvoicesCache();
        toast.success(`Invoice ${created.number} created`);
        navigate(`/invoices/${created.id}`, { replace: true });
        return created.id;
      }
      const updated = await api.invoices.update(Number(id), input);
      syncInvoicesCache();
      toast.success(`Invoice ${updated.number} saved`);
      return updated.id;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    const savedId = await save();
    if (savedId === null) return;
    try {
      const [invoice, settings, { downloadInvoicePdf }] = await Promise.all([
        api.invoices.get(savedId),
        api.settings.get(),
        import("@/lib/pdf"),
      ]);
      if (settings.fromLines.length === 0) {
        toast.warning("Your business details are empty. Fill them in under Settings.");
      }
      await downloadInvoicePdf(invoice, settings);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove() {
    try {
      await api.invoices.remove(Number(id));
      syncInvoicesCache();
      toast.success("Invoice deleted");
      navigate("/");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (loading || clients === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-muted-foreground">
            <Link to="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isNew ? "New invoice" : <span className="font-mono text-xl">{number}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button onClick={() => void downloadPdf()} disabled={saving}>
            <Download className="size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="number">Number</Label>
          <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} className="font-mono" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Client</Label>
          <Select
            value={clientId ? String(clientId) : undefined}
            onValueChange={(v) => setClientId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clients.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No clients yet.{" "}
              <Link to="/clients" className="underline underline-offset-2">
                Add one
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-8" />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Line items</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
        >
          <Plus className="size-4" />
          Add item
        </Button>
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border bg-card p-4">
                {/* Side by side on desktop; stacked on mobile, where a fixed-width
                    amount column left the title unreadably narrow. */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <Input
                      placeholder="Title, e.g. Project name - initial payment (50%)"
                      value={item.title}
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description (optional, one line per row on the PDF)"
                      value={item.description}
                      rows={2}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      className="resize-y text-sm"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:w-32 sm:flex-col sm:items-end">
                    <Input
                      placeholder="0.00"
                      inputMode="decimal"
                      value={item.amount}
                      onChange={(e) => updateItem(i, { amount: e.target.value })}
                      onBlur={(e) => {
                        const n = parseFloat(e.target.value);
                        updateItem(i, { amount: Number.isFinite(n) ? n.toFixed(2) : "" });
                      }}
                      className="w-full text-right font-mono tabular-nums"
                    />
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                        aria-label="Remove line item"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-baseline justify-end gap-6 border-t border-border pt-4">
        <span className="text-sm font-medium text-muted-foreground">Total</span>
        <span className="font-mono text-2xl font-semibold tabular-nums">{usd(total)}</span>
      </div>

      {!isNew && (
        <div className="mt-12 flex justify-end">
          <HoldButton onConfirm={() => void remove()}>Hold to delete invoice</HoldButton>
        </div>
      )}
    </motion.div>
  );
}
