import { ImagePlus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MAX_LOGO_BYTES, type Settings } from "../../shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { putResource, useResource } from "@/lib/use-resource";

function toLines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const LOGO_TYPES = ["image/png", "image/jpeg"];

export default function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: loaded, showSkeleton } = useResource("settings", api.settings.get);
  // Seed synchronously from cache so a revisit paints without a skeleton frame.
  const [settings, setSettings] = useState<Settings | null>(loaded ?? null);
  const [saving, setSaving] = useState(false);

  // Adopt server state on load; edits afterwards stay local until saved.
  useEffect(() => {
    if (loaded) setSettings(loaded);
  }, [loaded]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await api.settings.update(settings);
      putResource("settings", saved);
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function pickLogo(file: File | undefined) {
    if (!file || !settings) return;
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error("Logo must be a PNG or JPEG");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(`Logo must be under ${Math.round(MAX_LOGO_BYTES / 1024)} KB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, logo: String(reader.result) });
    reader.onerror = () => toast.error("Could not read that file");
    reader.readAsDataURL(file);
  }

  if (!settings) {
    if (!showSkeleton) return null;
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header spans the page like the other routes; only the fields are narrow. */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="flex max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {/* White, because that is what the logo will actually print on. */}
            <div className="flex h-20 w-40 shrink-0 items-center justify-center rounded-md border border-border bg-white p-3">
              {settings.logo ? (
                <motion.img
                  key={settings.logo.slice(-24)}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  src={settings.logo}
                  alt="Invoice logo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-zinc-400">No logo</span>
              )}
            </div>
            <div className="flex flex-col items-start gap-2">
              <input
                ref={fileInput}
                type="file"
                accept={LOGO_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  pickLogo(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                <ImagePlus className="size-4" />
                {settings.logo ? "Replace" : "Upload"}
              </Button>
              {settings.logo && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setSettings({ ...settings, logo: null })}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            PNG or JPEG under {Math.round(MAX_LOGO_BYTES / 1024)} KB. Printed at the top left of the
            invoice; transparent PNGs work best.
          </p>
        </div>

        <Separator />

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
