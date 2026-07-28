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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const emptyForm: ClientInput = { name: "", slug: "", email: "", notes: "" };

interface ClientDialogProps {
  /** A client to edit, "new" to create one, or null to stay closed. */
  target: Client | "new" | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
  onDeleted?: (client: Client) => void;
}

/** Shared by the clients page and the invoice editor, so both stay in step. */
export function ClientDialog({ target, onClose, onSaved, onDeleted }: ClientDialogProps) {
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm(
      target === "new"
        ? emptyForm
        : { name: target.name, slug: target.slug, email: target.email, notes: target.notes },
    );
  }, [target]);

  async function save() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const saved =
        target === "new"
          ? await api.clients.create(form)
          : await api.clients.update((target as Client).id, form);
      toast.success(target === "new" ? `${saved.name} added` : `${saved.name} saved`);
      onSaved(saved);
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
      onDeleted?.(client);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const isNew = target === "new";

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "New client" : "Edit client"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="client-name">Name</Label>
            <Input
              id="client-name"
              placeholder="Client Name, Inc."
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
              }}
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
          {!isNew && target ? (
            <HoldButton holdDuration={1200} onConfirm={() => void remove(target)}>
              Hold to delete
            </HoldButton>
          ) : (
            <span />
          )}
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Add client" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
