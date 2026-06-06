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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { getShopId, getShopInfo } from "@/lib/security";
import {
  Search,
  Printer,
  FileText,
  Download,
  Eye,
  Receipt,
  Building,
} from "lucide-react";
import type { Sale, Shop } from "@/types";

export default function InvoicesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [previewType, setPreviewType] = useState<"thermal_50mm" | "a5" | "a4">("thermal_50mm");
  const [previewOpen, setPreviewOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    getShopInfo().then(setShop);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const shopId = await getShopId();
    if (!shopId) { setLoading(false); return; }
    let q = supabase.from("sales").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
    if (search) q = q.ilike("client", `%${search}%`);
    const { data } = await q.limit(100);
    if (data) setSales(data as Sale[]);
    setLoading(false);
  }, [search, supabase]);

  useEffect(() => { load(); }, [load]);

  const openPreview = (sale: Sale) => {
    setSelectedSale(sale);
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturation</h1>
          <p className="text-sm text-muted-foreground">{sales.length} factures</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Building className="h-3 w-3" /> {shop?.name || "Boutique"}
          </Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par client..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="thermal">Thermique 50mm</TabsTrigger>
          <TabsTrigger value="a5">A5</TabsTrigger>
          <TabsTrigger value="a4">A4</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                ) : sales.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucune facture
                  </TableCell></TableRow>
                ) : sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoice_number}</TableCell>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.client || "-"}</TableCell>
                    <TableCell className="capitalize">{s.payment}</TableCell>
                    <TableCell className="text-right font-medium">{s.total?.toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPreview(s)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className={`max-w-lg ${previewType === "thermal_50mm" ? "max-w-[320px]" : ""}`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Aperçu facture</DialogTitle>
              <div className="flex gap-1 rounded-lg border p-0.5">
                <Button variant={previewType === "thermal_50mm" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setPreviewType("thermal_50mm")}>50mm</Button>
                <Button variant={previewType === "a5" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setPreviewType("a5")}>A5</Button>
                <Button variant={previewType === "a4" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setPreviewType("a4")}>A4</Button>
              </div>
            </div>
          </DialogHeader>

          {selectedSale && (
            <div className={`space-y-3 ${previewType === "thermal_50mm" ? "text-xs" : "text-sm"}`}>
              <div className="text-center border-b pb-2">
                {shop?.logo && <img src={shop.logo} alt="" className={`mx-auto mb-1 ${previewType === "thermal_50mm" ? "h-8" : "h-12"}`} />}
                <p className={`font-bold ${previewType === "thermal_50mm" ? "text-sm" : "text-base"}`}>{shop?.name || "Boutique"}</p>
                {shop?.address && <p className="text-muted-foreground">{shop.address}</p>}
                {shop?.phone && <p className="text-muted-foreground">Tél: {shop.phone}</p>}
                {shop?.ninea && <p className="text-muted-foreground">NINEA: {shop.ninea}</p>}
                {shop?.rccm && <p className="text-muted-foreground">RCCM: {shop.rccm}</p>}
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Facture</span>
                <span className="font-bold">{selectedSale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{selectedSale.date}</span>
              </div>
              {selectedSale.client && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span>{selectedSale.client}</span>
                </div>
              )}

              <div className="border-t pt-2">
                <table className="w-full">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left">Article</th>
                      <th className="text-right">Qté</th>
                      <th className="text-right">Prix</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(selectedSale.items) && selectedSale.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1">{item.product_name}</td>
                        <td className="text-right">{item.qty}</td>
                        <td className="text-right">{item.price?.toLocaleString()}</td>
                        <td className="text-right font-medium">{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedSale.discount ? (
                <div className="flex justify-between text-sm">
                  <span>Remise</span>
                  <span>-{selectedSale.discount.toLocaleString()} FCFA</span>
                </div>
              ) : null}

              <div className={`flex justify-between font-bold ${previewType === "thermal_50mm" ? "text-sm" : "text-lg"} border-t pt-2`}>
                <span>Total</span>
                <span>{selectedSale.total?.toLocaleString()} FCFA</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paiement</span>
                <span className="capitalize">{selectedSale.payment}</span>
              </div>

              <div className="text-center text-xs text-muted-foreground border-t pt-2">
                <p>Merci de votre confiance !</p>
              </div>

              {previewType !== "thermal_50mm" && (
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Vendeur</span>
                  <span>{selectedSale.vendor || "-"}</span>
                </div>
              )}

              <Button onClick={handlePrint} className="w-full">
                <Printer className="h-4 w-4 mr-2" /> Imprimer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
