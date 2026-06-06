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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { getShopId, getCurrentUser } from "@/lib/security";
import {
  Plus,
  Search,
  CreditCard,
  HandCoins,
  Phone,
  AlertTriangle,
  Check,
  History,
  TrendingUp,
} from "lucide-react";
import type { Credit } from "@/types";

export default function CreditsPage() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Credit>>({});
  const [open, setOpen] = useState(false);
  const [payInput, setPayInput] = useState({ id: "", amount: 0, method: "especes", open: false, note: "" });
  const [tab, setTab] = useState("active");
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const shopId = await getShopId();
    if (!shopId) { setLoading(false); return; }
    let q = supabase.from("credits").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
    if (search) q = q.ilike("client", `%${search}%`);
    const { data } = await q;
    if (data) setCredits(data as Credit[]);
    setLoading(false);
  }, [search, supabase]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      const shopId = await getShopId();
      if (edit.id) {
        await supabase.from("credits").update(edit).eq("id", edit.id);
      } else {
        await supabase.from("credits").insert({
          ...edit,
          id: crypto.randomUUID(),
          shop_id: shopId,
          total: Number(edit.total) || 0,
          paid: 0,
          status: "open",
          date: new Date().toISOString().split("T")[0],
        });
      }
      setOpen(false);
      setEdit({});
      load();
    } catch {}
  };

  const addPayment = async () => {
    const credit = credits.find((c) => c.id === payInput.id);
    if (!credit) return;
    const payments = Array.isArray(credit.payments) ? credit.payments : [];
    const newPaid = (credit.paid || 0) + Number(payInput.amount);
    const newStatus = newPaid >= (credit.total || 0) ? "paid" : newPaid > 0 ? "partial" : "open";
    const now = new Date().toISOString();
    await supabase
      .from("credits")
      .update({
        paid: newPaid,
        status: newStatus,
        payments: [...payments, { amount: Number(payInput.amount), date: now, method: payInput.method, note: payInput.note }],
      })
      .eq("id", payInput.id);
    setPayInput({ id: "", amount: 0, method: "especes", open: false, note: "" });
    load();
  };

  const activeCredits = credits.filter((c) => c.status !== "paid");
  const paidCredits = credits.filter((c) => c.status === "paid");

  const totalCredits = credits.reduce((s, c) => s + (c.total || 0), 0);
  const totalPaid = credits.reduce((s, c) => s + (c.paid || 0), 0);
  const totalPending = totalCredits - totalPaid;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Crédits clients</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button onClick={() => setEdit({ client: "", total: 0 })}><Plus className="h-4 w-4 mr-2" /> Nouveau crédit</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau crédit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Client *</Label><Input value={edit.client || ""} onChange={(e) => setEdit({ ...edit, client: e.target.value })} /></div>
              <div><Label>Montant total</Label><Input type="number" value={edit.total || 0} onChange={(e) => setEdit({ ...edit, total: Number(e.target.value) })} /></div>
              <div><Label>Date échéance</Label><Input type="date" value={edit.due || ""} onChange={(e) => setEdit({ ...edit, due: e.target.value })} /></div>
              <div><Label>Note</Label><Input value={edit.note || ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></div>
            </div>
            <Button onClick={save} className="w-full">Créer le crédit</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-500" /> Total crédits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits.toLocaleString()} FCFA</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" /> Remboursé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{totalPaid.toLocaleString()} FCFA</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" /> Reste à percevoir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{totalPending.toLocaleString()} FCFA</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par client..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">En cours ({activeCredits.length})</TabsTrigger>
          <TabsTrigger value="paid">Payés ({paidCredits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                  <TableHead className="text-right">Reste</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Chargement...</TableCell></TableRow>
                ) : activeCredits.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucun crédit en cours
                  </TableCell></TableRow>
                ) : activeCredits.map((c) => {
                  const rest = (c.total || 0) - (c.paid || 0);
                  const percent = c.total ? Math.round(((c.paid || 0) / c.total) * 100) : 0;
                  const isOverdue = c.due && new Date(c.due) < new Date() && c.status !== "paid";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.client}</TableCell>
                      <TableCell className="text-right">{c.total?.toLocaleString()} FCFA</TableCell>
                      <TableCell className="text-right">{c.paid?.toLocaleString()} FCFA</TableCell>
                      <TableCell className="text-right font-bold text-red-400">{rest.toLocaleString()} FCFA</TableCell>
                      <TableCell className="w-32">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{percent}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverdue ? "destructive" : c.status === "partial" ? "default" : "secondary"}>
                          {isOverdue ? "En retard" : c.status === "partial" ? "Partiel" : "Ouvert"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isOverdue ? "text-red-400 font-bold" : ""}>
                          {c.due || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setPayInput({ id: c.id, amount: 0, method: "especes", open: true, note: "" })}>
                            <HandCoins className="h-3 w-3 mr-1" /> Payer
                          </Button>
                          {isOverdue && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" title="Relancer client">
                              <Phone className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                  <TableHead>Payé le</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidCredits.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucun crédit payé
                  </TableCell></TableRow>
                ) : paidCredits.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.client}</TableCell>
                    <TableCell className="text-right">{c.total?.toLocaleString()} FCFA</TableCell>
                    <TableCell className="text-right text-emerald-500">{c.paid?.toLocaleString()} FCFA</TableCell>
                    <TableCell>{new Date(c.updated_at || "").toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{c.note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={payInput.open} onOpenChange={(v) => setPayInput({ ...payInput, open: v })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Montant</Label>
              <Input type="number" value={payInput.amount || ""} onChange={(e) => setPayInput({ ...payInput, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Méthode de paiement</Label>
              <Select value={payInput.method} onValueChange={(v) => v && setPayInput({ ...payInput, method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="transfert">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Input value={payInput.note} onChange={(e) => setPayInput({ ...payInput, note: e.target.value })} />
            </div>
          </div>
          <Button onClick={addPayment}>Valider le paiement</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
