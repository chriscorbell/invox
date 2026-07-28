import { Pencil, Plus, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Client, ClientInput } from "../../shared/types";
import HoldButton from "@/components/kokonutui/hold-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const emptyForm: ClientInput = { name: "", slug: "", email: "", notes: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = () =>
    api.clients
      .list()
      .then(setClients)
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    void refresh();
  }, []);

  function open(client: Client | "new") {
    setEditing(client);
    setForm(client === "new" ? emptyForm : { name: client.name, slug: client.slug, email: client.email, notes: client.notes });
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await api.clients.create(form);
        toast.success(`${form.name} added`);
      } else if (editing) {
        await api.clients.update(editing.id, form);
        toast.success(`${form.name} saved`);
      }
      setEditing(null);
      void refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(client: Client) {
    try {
      await api.clients.remove(client.id);
      toast.success(`${client.name} deleted`);
      setEditing(null);
      void refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Button onClick={() => open("new")}>
          <Plus className="size-4" />
          New client
        </Button>
      </div>

      {clients === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No clients yet. Add the first one to start invoicing.</p>
          <Button variant="outline" className="mt-1" onClick={() => open("new")}>
            <Plus className="size-4" />
            New client
          </Button>
        </div>
      ) : (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.03 } } }}
          className="divide-y divide-border"
        >
          {clients.map((client) => (
            <motion.li
              key={client.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              {/* The whole row opens the editor; a hover-only button gave no affordance. */}
              <button
                type="button"
                onClick={() => open(client)}
                aria-label={`Edit ${client.name}`}
                className="group flex min-h-14 w-full items-center gap-4 rounded-md px-2 py-3 text-left transition-colors hover:bg-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  {client.email && (
                    <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{client.slug}</span>
                <Pencil className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New client" : "Edit client"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-name">Name</Label>
              <Input
                id="client-name"
                placeholder="Client Name, Inc."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-slug">Filename slug</Label>
              <Input
                id="client-slug"
                placeholder="Defaults to the name without spaces"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Used in the PDF filename.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-notes">Notes</Label>
              <Textarea
                id="client-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="items-center gap-2 sm:justify-between">
            {editing !== "new" && editing !== null ? (
              <HoldButton holdDuration={1200} onConfirm={() => void remove(editing)}>
                Hold to delete
              </HoldButton>
            ) : (
              <span />
            )}
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing === "new" ? "Add client" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
