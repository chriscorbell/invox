import { Pencil, Plus, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Client } from "../../shared/types";
import { ClientDialog } from "@/components/client-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

export default function ClientsPage() {
  const { data: clients, warm, showSkeleton, reload } = useResource("clients", api.clients.list);
  const [editing, setEditing] = useState<Client | "new" | null>(null);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" />
          New client
        </Button>
      </div>

      {clients === undefined ? (
        showSkeleton && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No clients yet. Add the first one to start invoicing.</p>
          <Button variant="outline" className="mt-1" onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            New client
          </Button>
        </div>
      ) : (
        <motion.ul
          initial={warm ? false : "hidden"}
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
                onClick={() => setEditing(client)}
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

      <ClientDialog
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void reload();
        }}
        onDeleted={() => {
          setEditing(null);
          void reload();
        }}
      />
    </div>
  );
}
