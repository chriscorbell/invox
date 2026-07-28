import { FileText, Settings2, Users } from "lucide-react";
import { motion } from "motion/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Invoices", icon: FileText },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/" || pathname.startsWith("/invoices");
  return pathname.startsWith(to);
}

export default function App() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-[100dvh]">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-52 flex-col border-r border-border bg-background px-3 py-5 max-md:hidden">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
            i
          </div>
          <span className="text-[15px] font-semibold tracking-tight">invox</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-secondary"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon className="relative z-10 size-4" strokeWidth={2} />
                <span className="relative z-10">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-background/95 py-2 backdrop-blur md:hidden">
        {nav.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-4 py-1 text-xs font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <main className="min-w-0 flex-1 md:pl-52">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 pb-24 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
