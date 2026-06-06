"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { getShopId, getCurrentUser, requirePinAction } from "@/lib/security";
import {
  Search,
  Receipt,
  Eye,
  Trash2,
  RotateCcw,
  Printer,
  Lock,
} from "lucide-react";
import type { Sale } from "@/types";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [deletedSales, setDeletedSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [tab, setTab] = useState("active");
  const [userId, setUserId] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) setUserId(u.id);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const shopId = await getShopId();
    if (!shopId) { setLoading(false); return; }
    const [activeRes, deletedRes] = await Promise.all([
      supabase.from("sales").select("*").eq("shop_id", shopId).is("deleted_at", null).order("created_at", { ascending: false }).limit(100),
      supabase.from("sales").select("*").eq("shop_id", shopId).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(50),
    ]);
    if (activeRes.data) setSales(activeRes.data as Sale[]);
    if (deletedRes.data) setDeletedSales(deletedRes.data as Sale[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (saleId: string) => {
    const valid = await requirePinAction(userId, pinInput, "delete_sale", "sale", saleId);
    if (!valid) { setPinError(true); return; }
    await supabase.from("sales").update({ deleted_at: new Date().toISOString() }).eq("id", saleId);
    setDeleteTarget(null);
    setPinInput("");
    setPinError(false);
    load();
  };

  const handleRestore = async (saleId: string) => {
    await supabase.from("sales").update({ deleted_at: null }).eq("id", saleId);
    load();
  };

  const totalCA = sales.reduce((s, v) => s + (v.total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventes</h1>
          <p className="text-sm text-muted-foreground">
            {sales.length} ventes · {totalCA.toLocaleString()} FCFA total
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par client..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Ventes ({sales.length})</TabsTrigger>
          <TabsTrigger value="deleted">Corbeille ({deletedSales.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Vendeur</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                ) : sales.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucune vente
                  </TableCell></TableRow>
                ) : sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoice_number}</TableCell>
                    <TableCell className="text-xs">{s.date}</TableCell>
                    <TableCell>{s.client || "-"}</TableCell>
                    <TableCell className="capitalize text-xs">{s.payment}</TableCell>
                    <TableCell className="text-xs">{s.vendor || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{s.total?.toLocaleString()} FCFA</TableCell>
                    <TableCell className="text-right text-emerald-400">{s.profit?.toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(s)}><Eye className="h-3 w-3" /></Button>} />
                          <DialogContent>
                            <DialogHeader><DialogTitle>Vente {s.invoice_number}</DialogTitle></DialogHeader>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between"><span className="text-muted-foreground">Facture</span><span className="font-mono">{s.invoice_number}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{s.date}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span>{s.client || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Vendeur</span><span>{s.vendor || "-"}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Paiement</span><span className="capitalize">{s.payment}</span></div>
                              {s.discount ? <div className="flex justify-between"><span className="text-muted-foreground">Remise</span><span>{s.discount}%</span></div> : null}
                              <div className="border-t pt-2 mt-2">
                                <p className="font-medium mb-1">Articles</p>
                                {Array.isArray(s.items) && s.items.map((item, i) => (
                                  <div key={i} className="flex justify-between text-xs py-1">
                                    <span>{item.product_name} x{item.qty}</span>
                                    <span>{item.total?.toLocaleString()} FCFA</span>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t pt-2 flex justify-between font-bold text-base">
                                <span>Total</span>
                                <span>{s.total?.toLocaleString()} FCFA</span>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => setDeleteTarget(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="deleted" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Supprimé le</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedSales.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Corbeille vide
                  </TableCell></TableRow>
                ) : deletedSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoice_number}</TableCell>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.client || "-"}</TableCell>
                    <TableCell className="text-right">{s.total?.toLocaleString()} FCFA</TableCell>
                    <TableCell className="text-xs">{s.deleted_at ? new Date(s.deleted_at).toLocaleString("fr-FR") : "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400" onClick={() => handleRestore(s.id)}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) { setDeleteTarget(null); setPinInput(""); setPinError(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Supprimer la vente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action déplacera la vente dans la corbeille. Entrez votre code secret pour confirmer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Code secret"
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
            maxLength={6}
            className="text-center text-lg tracking-widest"
          />
          {pinError && <p className="text-sm text-red-500 text-center">Code secret incorrect</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
