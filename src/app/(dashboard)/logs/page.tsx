"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Search, History, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Log {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  data: unknown;
  created_at: string;
  user_id: string;
  shop_id: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (entity !== "all") q = q.eq("entity", entity);
    if (search) q = q.ilike("action", `%${search}%`);
    const { data } = await q;
    if (data) setLogs(data as Log[]);
    setLoading(false);
  }, [search, entity, supabase]);

  useEffect(() => { load(); }, [load]);

  const actionBadge = (action: string) => {
    const map: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return <Badge variant={map[action] || "secondary"}>{action}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journal d'activité</h1>
          <p className="text-sm text-muted-foreground">{logs.length} entrées</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Actualiser</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher action..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-44">
          <Select value={entity} onValueChange={(v) => setEntity(v ?? "all")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout</SelectItem>
              <SelectItem value="products">Produits</SelectItem>
              <SelectItem value="sales">Ventes</SelectItem>
              <SelectItem value="clients">Clients</SelectItem>
              <SelectItem value="expenses">Dépenses</SelectItem>
              <SelectItem value="credits">Crédits</SelectItem>
              <SelectItem value="employees">Employés</SelectItem>
              <SelectItem value="deliveries">Livraisons</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entité</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Chargement...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucun journal
              </TableCell></TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString("fr-FR")}</TableCell>
                <TableCell>{actionBadge(log.action)}</TableCell>
                <TableCell className="capitalize">{log.entity}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {JSON.stringify(log.data)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
