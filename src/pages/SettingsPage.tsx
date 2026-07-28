import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Settings } from "../../shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

function toLines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then(setSettings)
      .catch((e) => toast.error(e.message));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await api.settings.update(settings);
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="from">From</Label>
          <Textarea
            id="from"
            rows={3}
            placeholder={"Your Name\nyourdomain.com\nyou@yourdomain.com"}
            value={settings.fromLines.join("\n")}
            onChange={(e) => setSettings({ ...settings, fromLines: e.target.value.split("\n") })}
            onBlur={(e) => setSettings({ ...settings, fromLines: toLines(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">Shown in the FROM block of the PDF, one line per row.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ach">Payment details</Label>
          <Textarea
            id="ach"
            rows={5}
            placeholder={"Account Holder: …\nBank Name: …\nRouting Number: …\nAccount Number: …\nAccount Type: …"}
            value={settings.achLines.join("\n")}
            onChange={(e) => setSettings({ ...settings, achLines: e.target.value.split("\n") })}
            onBlur={(e) => setSettings({ ...settings, achLines: toLines(e.target.value) })}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Shown under PAYMENT BY ACH TRANSFER. Stored only in the invox database on your server.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="footer">Footer notes</Label>
          <Textarea
            id="footer"
            rows={2}
            value={settings.footerNotes.join("\n")}
            onChange={(e) => setSettings({ ...settings, footerNotes: e.target.value.split("\n") })}
            onBlur={(e) => setSettings({ ...settings, footerNotes: toLines(e.target.value) })}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label htmlFor="prefix">PDF filename prefix</Label>
          <Input
            id="prefix"
            value={settings.filenamePrefix}
            onChange={(e) => setSettings({ ...settings, filenamePrefix: e.target.value })}
            className="max-w-48 font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Files download as {settings.filenamePrefix || "Prefix"}-2026-0001-ClientName.pdf
          </p>
        </div>
      </div>
    </div>
  );
}
