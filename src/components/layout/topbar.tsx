"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/providers/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { getShopId, getCurrentUser } from "@/lib/security";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Menu, Search, Sun, Moon, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  created_at: string;
}

export function Topbar() {
  const { sidebarOpen, toggleSidebar, shopName } = useAppStore();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const load = async () => {
      const shopId = await getShopId();
      if (!shopId) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) {
        setNotifications(data as NotificationItem[]);
        setUnreadCount(data.filter((n: { read: boolean }) => !n.read).length);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [supabase]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const clearAll = async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative flex-1 max-w-sm hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-9 h-9" />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-muted-foreground hidden md:block">
          {new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
        </span>
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAll}>
                  Tout marquer lu
                </Button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune notification</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-2 px-3 py-2 border-b last:border-0 text-sm hover:bg-muted/50 cursor-pointer",
                      !n.read && "bg-amber-500/5"
                    )}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "solarized-dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
