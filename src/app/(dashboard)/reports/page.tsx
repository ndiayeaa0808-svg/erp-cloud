"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getShopId } from "@/lib/security";
import {
  BarChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Building,
  CalendarDays,
  FileDown,
} from "lucide-react";

export default function ReportsPage() {
  const [data, setData] = useState({
    sales: { total: 0, count: 0, avg: 0 },
    expenses: { total: 0, count: 0 },
    credits: { total: 0, pending: 0, paid: 0 },
    thisMonth: { sales: 0, expenses: 0 },
    today: { sales: 0, expenses: 0, cash: 0, mobile: 0 },
    byVendor: [] as { vendor: string; total: number; count: number }[],
  });
  const supabase = createClient();

  const load = useCallback(async () => {
    const shopId = await getShopId();
    const todayStr = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [salesRes, expensesRes, creditsRes, thisMonthSales, thisMonthExpenses, todaySales, cashRegisters] = await Promise.all([
      supabase.from("sales").select("total,vendor").eq("shop_id", shopId),
      supabase.from("expenses").select("amount").eq("shop_id", shopId),
      supabase.from("credits").select("total,paid,status").eq("shop_id", shopId),
      supabase.from("sales").select("total").eq("shop_id", shopId).gte("created_at", monthStart),
      supabase.from("expenses").select("amount").eq("shop_id", shopId).gte("date", todayStr),
      supabase.from("sales").select("total,payment,vendor").eq("shop_id", shopId).gte("created_at", new Date().toISOString().split("T")[0]),
      supabase.from("cash_registers").select("*").eq("shop_id", shopId),
    ]);

    const sales = salesRes.data || [];
    const expenses = expensesRes.data || [];
    const credits = creditsRes.data || [];
    const monthSales = thisMonthSales.data || [];
    const monthExpenses = thisMonthExpenses.data || [];
    const today = todaySales.data || [];

    const vendorMap = new Map<string, { total: number; count: number }>();
    for (const s of sales) {
      const v = s.vendor || "Inconnu";
      const existing = vendorMap.get(v) || { total: 0, count: 0 };
      existing.total += s.total || 0;
      existing.count += 1;
      vendorMap.set(v, existing);
    }

    setData({
      sales: { total: sales.reduce((s, r) => s + (r.total || 0), 0), count: sales.length, avg: sales.length ? sales.reduce((s, r) => s + (r.total || 0), 0) / sales.length : 0 },
      expenses: { total: expenses.reduce((s, r) => s + (r.amount || 0), 0), count: expenses.length },
      credits: {
        total: credits.reduce((s, c) => s + (c.total || 0), 0),
        pending: credits.filter((c) => c.status !== "paid").reduce((s, c) => s + ((c.total || 0) - (c.paid || 0)), 0),
        paid: credits.filter((c) => c.status === "paid").reduce((s, c) => s + (c.total || 0), 0),
      },
      thisMonth: { sales: monthSales.reduce((s, r) => s + (r.total || 0), 0), expenses: monthExpenses.reduce((s, r) => s + (r.amount || 0), 0) },
      today: {
        sales: today.reduce((s, r) => s + (r.total || 0), 0),
        expenses: monthExpenses.reduce((s, r) => s + (r.amount || 0), 0),
        cash: today.filter((r) => r.payment === "especes").reduce((s, r) => s + (r.total || 0), 0),
        mobile: today.filter((r) => ["orange_money", "wave", "free_money"].includes(r.payment)).reduce((s, r) => s + (r.total || 0), 0),
      },
      byVendor: Array.from(vendorMap.entries()).map(([vendor, vals]) => ({ vendor, ...vals })).sort((a, b) => b.total - a.total),
    });
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const profit = data.thisMonth.sales - data.thisMonth.expenses;
  const netProfit = data.sales.total - data.expenses.total;

  const statCards = [
    { title: "Ventes ce mois", value: `${data.thisMonth.sales.toLocaleString()} FCFA`, icon: TrendingUp, color: "text-emerald-500" },
    { title: "Dépenses ce mois", value: `${data.thisMonth.expenses.toLocaleString()} FCFA`, icon: TrendingDown, color: "text-red-500" },
    { title: "Profit mensuel", value: `${profit.toLocaleString()} FCFA`, icon: DollarSign, color: profit >= 0 ? "text-emerald-500" : "text-red-500" },
    { title: "Total ventes", value: `${data.sales.count} ventes`, sub: `${data.sales.total.toLocaleString()} FCFA`, icon: ShoppingCart, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rapports & Comptabilité</h1>
          <p className="text-sm text-muted-foreground">Analyse financière complète</p>
        </div>
        <Button variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="accounting">Comptabilité</TabsTrigger>
          <TabsTrigger value="vendors">Par vendeur</TabsTrigger>
          <TabsTrigger value="credits">Crédits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Synthèse financière</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total ventes</p>
                  <p className="text-lg font-bold">{data.sales.total.toLocaleString()} FCFA</p>
                  <p className="text-sm text-muted-foreground">Panier moyen</p>
                  <p className="text-lg font-bold">{data.sales.avg.toLocaleString()} FCFA</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total dépenses</p>
                  <p className="text-lg font-bold">{data.expenses.total.toLocaleString()} FCFA</p>
                  <p className="text-sm text-muted-foreground">Bénéfice net</p>
                  <p className={`text-lg font-bold ${netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {netProfit.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Résumé du jour</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ventes</p>
                  <p className="text-xl font-bold">{data.today.sales.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Espèces</p>
                  <p className="text-xl font-bold">{data.today.cash.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile Money</p>
                  <p className="text-xl font-bold">{data.today.mobile.toLocaleString()} FCFA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounting" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-amber-500" /> Entrées du jour
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{data.today.sales.toLocaleString()} FCFA</div>
                <p className="text-xs text-muted-foreground">Dont {data.today.cash.toLocaleString()} FCFA espèces</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" /> Sorties du jour
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{data.today.expenses.toLocaleString()} FCFA</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-500" /> Bilan mensuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profit.toLocaleString()} FCFA</div>
                <p className="text-xs text-muted-foreground">{(profit / (data.thisMonth.sales || 1) * 100).toFixed(1)}% de marge</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-500" /> Crédits impayés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{data.credits.pending.toLocaleString()} FCFA</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Bilan annuel estimé</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ventes annuelles</p>
                  <p className="text-lg font-bold">{(data.thisMonth.sales * 12).toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dépenses annuelles</p>
                  <p className="text-lg font-bold">{(data.thisMonth.expenses * 12).toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bénéfice annuel</p>
                  <p className={`text-lg font-bold ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {(profit * 12).toLocaleString()} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total crédits</p>
                  <p className="text-lg font-bold">{data.credits.total.toLocaleString()} FCFA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Performances par vendeur</CardTitle></CardHeader>
            <CardContent>
              {data.byVendor.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucune donnée</p>
              ) : (
                <div className="space-y-3">
                  {data.byVendor.map((v) => (
                    <div key={v.vendor} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{v.vendor}</p>
                        <p className="text-xs text-muted-foreground">{v.count} vente(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{v.total.toLocaleString()} FCFA</p>
                        <p className="text-xs text-muted-foreground">{data.sales.total ? `${((v.total / data.sales.total) * 100).toFixed(1)}%` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Crédits accordés</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{data.credits.total.toLocaleString()} FCFA</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Reste à percevoir</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-500">{data.credits.pending.toLocaleString()} FCFA</div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Crédits remboursés</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-500">{data.credits.paid.toLocaleString()} FCFA</div></CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
