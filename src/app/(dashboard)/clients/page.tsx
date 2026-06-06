"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { getShopId } from "@/lib/security";
import { Plus, Search, Users, Pencil } from "lucide-react";
import type { Client } from "@/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Client>>({});
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const shopId = await getShopId();
    if (!shopId) { setLoading(false); return; }
    let q = supabase.from("clients").select("*").eq("shop_id", shopId).order("name");
    if (search) q = q.ilike("name", `%${search}%`);
    const { data } = await q;
    if (data) setClients(data as Client[]);
    setLoading(false);
  }, [search, supabase]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      const shopId = await getShopId();
      if (edit.id) {
        await supabase.from("clients").update(edit).eq("id", edit.id);
      } else {
        await supabase.from("clients").insert({ ...edit, id: crypto.randomUUID(), shop_id: shopId });
      }
      setOpen(false);
      setEdit({});
      load();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients ({clients.length})</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button onClick={() => setEdit({ name: "" })}><Plus className="h-4 w-4 mr-2" /> Nouveau client</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? "Modifier" : "Nouveau"} client</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom *</Label><Input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={edit.phone || ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={edit.email || ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
              <div><Label>Adresse</Label><Input value={edit.address || ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
            </div>
            <Button onClick={save} className="w-full">{edit.id ? "Enregistrer" : "Créer"}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Dépenses totales</TableHead>
              <TableHead>Points fidélité</TableHead>
              <TableHead className="w-16">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Chargement...</TableCell></TableRow>
            ) : clients.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucun client
              </TableCell></TableRow>
            ) : clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone || "-"}</TableCell>
                <TableCell>{c.email || "-"}</TableCell>
                <TableCell className="font-medium">{(c.total_spent || 0).toLocaleString()} FCFA</TableCell>
                <TableCell>{c.loyalty_points || 0}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEdit(c); setOpen(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
