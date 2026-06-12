"use client";

import { useRequirePermission } from "@/lib/use-permission";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { getShopId } from "@/lib/security";
import { Plus, Search, Pencil, Trash2, Receipt } from "lucide-react";
import type { Expense } from "@/types";

const categories = ["Achat stock", "Loyer", "Électricité", "Eau", "Internet", "Transport", "Salaire", "Marketing", "Entretien", "Frais bancaires", "Impôts", "Autre"];

export default function ExpensesPage() {
  useRequirePermission("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Expense>>({});
  const [open, setOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    setLoading(true);
    const shopId = await getShopId();
    let q = supabase.from("expenses").select("*").eq("shop_id", shopId).order("date", { ascending: false });
    if (search) q = q.ilike("desc", `%${search}%`);
    const { data } = await q;
    if (data) setExpenses(data as Expense[]);
    setLoading(false);
  }, [search, supabase]);

  useEffect(() => { load(); }, [load]);

  const totalDepenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const save = async () => {
    try {
      const shopId = await getShopId();
      if (edit.id) {
        await supabase.from("expenses").update(edit).eq("id", edit.id);
      } else {
        await supabase.from("expenses").insert({
          ...edit, id: crypto.randomUUID(), shop_id: shopId, date: edit.date || new Date().toISOString().split("T")[0],
        });
      }
      setOpen(false);
      setEdit({});
      load();
    } catch {}
  };

  const remove = async (id: string) => {
    const shopId = await getShopId();
    await supabase.from("expenses").delete().eq("id", id).eq("shop_id", shopId);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dépenses</h1>
          <p className="text-sm text-muted-foreground">{expenses.length} dépenses · {totalDepenses.toLocaleString()} FCFA total</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button onClick={() => setEdit({ desc: "", amount: 0, cat: "Autre", date: new Date().toISOString().split("T")[0] })}><Plus className="h-4 w-4 mr-2" /> Nouvelle dépense</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? "Modifier" : "Nouvelle"} dépense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Description *</Label><Input value={edit.desc || ""} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} /></div>
              <div>
                <Label>Catégorie</Label>
                <Select value={edit.cat || "Autre"} onValueChange={(v) => setEdit({ ...edit, cat: v ?? undefined })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Montant</Label><Input type="number" value={edit.amount || 0} onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) })} /></div>
              <div><Label>Date</Label><Input type="date" value={edit.date || ""} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></div>
              <div><Label>Note</Label><Input value={edit.note || ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></div>
            </div>
            <Button onClick={save}>{edit.id ? "Enregistrer" : "Ajouter"}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Chargement...</TableCell></TableRow>
            ) : expenses.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucune dépense
              </TableCell></TableRow>
            ) : expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.date}</TableCell>
                <TableCell className="font-medium">{e.desc}</TableCell>
                <TableCell>{e.cat}</TableCell>
                <TableCell className="text-right font-medium">{e.amount?.toLocaleString()} FCFA</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEdit(e); setOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Supprimer ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(e.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
