"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  CreditCard,
  Users,
  Receipt,
  BarChart3,
  UserCog,
  ClipboardList,
  Settings,
  Users2,
  ChevronLeft,
  LogOut,
  BookOpen,
  Calculator,
} from "lucide-react";

const navItems = [
  { label: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { label: "Caisse POS", href: "/pos", icon: ShoppingCart },
  { label: "Produits", href: "/products", icon: Package },
  { label: "Ventes", href: "/sales", icon: DollarSign },
  { label: "Crédits", href: "/credits", icon: CreditCard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Dépenses", href: "/expenses", icon: Receipt },
  { label: "Rapports", href: "/reports", icon: BarChart3 },
  { label: "Employés", href: "/employees", icon: Users2 },
  { label: "Caisse", href: "/cash-register", icon: Calculator },
  { label: "Facturation", href: "/invoices", icon: BookOpen },
  { label: "Utilisateurs", href: "/users", icon: UserCog },
  { label: "Journaux", href: "/logs", icon: ClipboardList },
  { label: "Paramètres", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, shopName } = useAppStore();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-full flex-col border-r bg-card transition-all duration-300",
        sidebarOpen ? "w-56" : "w-16"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-sm">
          ✦
        </div>
        {sidebarOpen && (
          <span className="truncate text-sm font-semibold">{shopName}</span>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-start gap-3",
                    !sidebarOpen && "justify-center px-0"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && (
                    <span className="text-xs">{item.label}</span>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn("w-full", !sidebarOpen && "justify-center")}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              !sidebarOpen && "rotate-180"
            )}
          />
          {sidebarOpen && <span className="text-xs">Réduire</span>}
        </Button>
      </div>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn("w-full text-red-400 hover:text-red-300", !sidebarOpen && "justify-center")}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span className="text-xs">Déconnexion</span>}
        </Button>
      </div>
    </aside>
  );
}
