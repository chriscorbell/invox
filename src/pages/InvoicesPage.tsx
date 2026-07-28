import { FileText, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Invoice, InvoiceStatus } from "../../shared/types";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import SmoothTab from "@/components/kokonutui/smooth-tab";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { longDate, usd } from "@/lib/format";

type Filter = "all" | InvoiceStatus;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.invoices
      .list()
      .then(setInvoices)
      .catch((e) => toast.error(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return filter === "all" ? invoices : invoices.filter((i) => i.status === filter);
  }, [invoices, filter]);

  const searchResults = useMemo(() => {
    if (!invoices || !query.trim()) return [];
    const q = query.toLowerCase();
    return invoices
      .filter((i) => `${i.number} ${i.clientName}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((i) => ({
        id: String(i.id),
        label: i.number,
        icon: <FileText className="size-4" />,
        description: i.clientName,
        end: usd(i.total),
        onSelect: () => navigate(`/invoices/${i.id}`),
      }));
  }, [invoices, query, navigate]);

  const outstanding = invoices?.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0) ?? 0;
  const year = new Date().getFullYear();
  const paidThisYear =
    invoices
      ?.filter((i) => i.status === "paid" && i.date.startsWith(String(year)))
      .reduce((s, i) => s + i.total, 0) ?? 0;

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, draft: 0, sent: 0, paid: 0 };
    for (const i of invoices ?? []) {
      c.all += 1;
      c[i.status] += 1;
    }
    return c;
  }, [invoices]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <Button asChild>
          <Link to="/invoices/new">
            <Plus className="size-4" />
            New invoice
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-4 border-y border-border py-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
          <p className="mt-1 font-mono text-xl font-medium tabular-nums">{usd(outstanding)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Paid in {year}</p>
          <p className="mt-1 font-mono text-xl font-medium tabular-nums">{usd(paidThisYear)}</p>
        </div>
        <div className="max-sm:hidden">
          <p className="text-xs font-medium text-muted-foreground">Invoices</p>
          <p className="mt-1 font-mono text-xl font-medium tabular-nums">{counts.all}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SmoothTab
          items={[
            { id: "all", title: "All" },
            { id: "draft", title: "Draft", count: counts.draft },
            { id: "sent", title: "Sent", count: counts.sent },
            { id: "paid", title: "Paid", count: counts.paid },
          ]}
          value={filter}
          onChange={(id) => setFilter(id as Filter)}
        />
        <ActionSearchBar
          value={query}
          onChange={setQuery}
          results={searchResults}
          placeholder="Search invoices"
          className="w-64 max-sm:w-full"
        />
      </div>

      {invoices === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <FileText className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {counts.all === 0 ? "No invoices yet. Create your first one." : "No invoices match this filter."}
          </p>
          {counts.all === 0 && (
            <Button asChild variant="outline" className="mt-1">
              <Link to="/invoices/new">
                <Plus className="size-4" />
                New invoice
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.03 } } }}
          className="divide-y divide-border"
        >
          {filtered.map((invoice) => (
            <motion.li
              key={invoice.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              <Link
                to={`/invoices/${invoice.id}`}
                className="group block px-2 py-3 transition-colors hover:bg-card"
              >
                <div className="flex items-center gap-4">
                  <span className="w-24 shrink-0 font-mono text-sm tabular-nums">{invoice.number}</span>
                  <span className="hidden min-w-0 flex-1 truncate text-sm sm:block">
                    {invoice.clientName}
                  </span>
                  <span className="hidden shrink-0 text-sm text-muted-foreground md:block">
                    {longDate(invoice.date)}
                  </span>
                  <StatusBadge
                    status={invoice.status}
                    className="hidden w-14 shrink-0 justify-center sm:inline-flex"
                  />
                  <span className="ml-auto w-28 shrink-0 text-right font-mono text-sm font-medium tabular-nums sm:ml-0">
                    {usd(invoice.total)}
                  </span>
                </div>
                {/* Narrow screens cannot fit one row without crushing the client name. */}
                <div className="mt-1.5 flex items-center gap-3 sm:hidden">
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {invoice.clientName}
                  </span>
                  <StatusBadge status={invoice.status} className="shrink-0" />
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
