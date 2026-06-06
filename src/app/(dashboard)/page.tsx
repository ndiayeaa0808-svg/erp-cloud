"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Package,
  DollarSign,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
  BarChart3,
  Store,
  AlertTriangle,
  Calendar,
  LineChart,
  PieChart,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getShopId } from "@/lib/security";
import {
  LineChart as ReLineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export default function DashboardPage() {
  const [data, setData] = useState({
    todaySales: 0,
    todaySalesCount: 0,
    productsCount: 0,
    lowStock: 0,
    clientsCount: 0,
    newClients: 0,
    totalRevenue: 0,
    totalProfit: 0,
    stockValue: 0,
    recentSales: [] as { id: string; client: string; total: number; profit: number; created_at: string; vendor: string }[],
    lowStockProducts: [] as { id: string; name: string; stock: number; threshold: number; photo?: string }[],
    pendingCredits: 0,
    todayExpenses: 0,
    topProducts: [] as { name: string; total: number; count: number }[],
    revenueByPeriod: [] as { label: string; revenue: number; profit: number; expenses: number }[],
    paymentBreakdown: [] as { name: string; value: number }[],
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("daily");
  const supabase = createClient();

  const load = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const shopId = await getShopId();

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case "weekly":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 28);
        break;
      case "monthly":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      case "quarterly":
        startDate = new Date(now.getFullYear() - 2, 0, 1);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear() - 4, 0, 1);
        break;
    }

    const [
      todaySalesRes,
      productsRes,
      clientsRes,
      allSalesRes,
      recentSalesRes,
      lowStockRes,
      creditsRes,
      todayExpensesRes,
      newClientsRes,
      salesPeriodRes,
      expensesPeriodRes,
    ] = await Promise.all([
      supabase.from("sales").select("total").gte("created_at", todayStr),
      supabase.from("products").select("id, retail, stock", { count: "exact", head: true }),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("sales").select("total, profit, items, payment"),
      supabase.from("sales").select("id,client,total,profit,created_at,vendor").order("created_at", { ascending: false }).limit(10),
      supabase.from("products").select("id,name,stock,threshold,photo"),
      supabase.from("credits").select("total,paid,status").neq("status", "paid"),
      supabase.from("expenses").select("amount").gte("date", todayStr.split("T")[0]),
      supabase.from("clients").select("id").gte("created_at", monthStart),
      supabase.from("sales").select("total, profit, date, created_at").gte("created_at", startDate.toISOString()),
      supabase.from("expenses").select("amount, date").gte("date", startDate.toISOString().split("T")[0]),
    ]);

    const periodLabel: string[] = [];
    const allProducts = lowStockRes.data || [];
    const lowStockData = allProducts.filter((p: { stock: number; threshold: number }) => (p.stock || 0) < (p.threshold || 10));

    const allSales = allSalesRes.data || [];
    const topProductsMap = new Map<string, { name: string; total: number; count: number }>();
    for (const sale of allSales) {
      if (sale.items && Array.isArray(sale.items)) {
        for (const item of sale.items) {
          const existing = topProductsMap.get(item.product_name) || { name: item.product_name, total: 0, count: 0 };
          existing.total += item.total || 0;
          existing.count += item.qty || 0;
          topProductsMap.set(item.product_name, existing);
        }
      }
    }
    const topProducts = Array.from(topProductsMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

    const stockValue = (productsRes.data || []).reduce((s: number, p: { retail?: number; stock?: number }) => s + ((p.retail || 0) * (p.stock || 0)), 0);

    const totalProfit = allSales.reduce((s: number, r: { profit?: number }) => s + (r.profit || 0), 0);

    const paymentCounts: Record<string, { count: number; total: number }> = {};
    for (const sale of allSales) {
      const method = sale.payment || "especes";
      if (!paymentCounts[method]) paymentCounts[method] = { count: 0, total: 0 };
      paymentCounts[method].count++;
      paymentCounts[method].total += sale.total || 0;
    }
    const paymentBreakdown = Object.entries(paymentCounts).map(([name, val]) => ({ name, value: val.total }));

    const salesPeriod = salesPeriodRes.data || [];
    const expensesPeriod = expensesPeriodRes.data || [];

    const revenueByPeriod = buildPeriodData(salesPeriod, expensesPeriod, period, startDate, periodLabel);

    setData({
      todaySales: (todaySalesRes.data || []).reduce((s: number, r: { total?: number }) => s + (r.total || 0), 0),
      todaySalesCount: (todaySalesRes.data || []).length,
      productsCount: productsRes.count || 0,
      lowStock: lowStockData.length,
      clientsCount: clientsRes.count || 0,
      newClients: (newClientsRes.data || []).length,
      totalRevenue: allSales.reduce((s: number, r: { total?: number }) => s + (r.total || 0), 0),
      totalProfit,
      stockValue,
      recentSales: (recentSalesRes.data || []) as typeof data.recentSales,
      lowStockProducts: lowStockData as typeof data.lowStockProducts,
      pendingCredits: (creditsRes.data || []).reduce((s: number, c: { total?: number; paid?: number }) => s + ((c.total || 0) - (c.paid || 0)), 0),
      todayExpenses: (todayExpensesRes.data || []).reduce((s: number, r: { amount?: number }) => s + (r.amount || 0), 0),
      topProducts,
      revenueByPeriod,
      paymentBreakdown,
    });
    setLoading(false);
  }, [period, supabase]);

  useEffect(() => { load(); }, [load]);

  function buildPeriodData(
    sales: { total?: number; profit?: number; date?: string; created_at?: string }[],
    expenses: { amount?: number; date?: string }[],
    p: Period,
    start: Date,
    labels: string[]
  ) {
    const refDate = new Date();
    const map = new Map<string, { revenue: number; profit: number; expenses: number }>();

    if (p === "daily") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split("T")[0];
        map.set(key, { revenue: 0, profit: 0, expenses: 0 });
      }
      for (const s of sales) {
        const date = (s.created_at || "").split("T")[0];
        if (map.has(date)) {
          const d = map.get(date)!;
          d.revenue += s.total || 0;
          d.profit += s.profit || 0;
        }
      }
      for (const e of expenses) {
        const date = e.date || "";
        if (map.has(date)) {
          map.get(date)!.expenses += e.amount || 0;
        }
      }
      const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      return Array.from(map.entries()).map(([k, v]) => ({
        label: dayNames[new Date(k).getDay()],
        ...v,
      }));
    }

    if (p === "weekly") {
      const byMonth: Record<string, { revenue: number; profit: number; expenses: number }> = {};
      for (const s of sales) {
        const m = (s.created_at || "").substring(0, 7);
        if (!byMonth[m]) byMonth[m] = { revenue: 0, profit: 0, expenses: 0 };
        byMonth[m].revenue += s.total || 0;
        byMonth[m].profit += s.profit || 0;
      }
      for (const e of expenses) {
        const m = (e.date || "").substring(0, 7);
        if (!byMonth[m]) byMonth[m] = { revenue: 0, profit: 0, expenses: 0 };
        byMonth[m].expenses += e.amount || 0;
      }
      return Object.entries(byMonth).slice(-4).map(([k, v]) => ({
        label: k.substring(5),
        ...v,
      }));
    }

    if (p === "monthly") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, { revenue: 0, profit: 0, expenses: 0 });
      }
      for (const s of sales) {
        const key = (s.created_at || "").substring(0, 7);
        if (map.has(key)) {
          const d = map.get(key)!;
          d.revenue += s.total || 0;
          d.profit += s.profit || 0;
        }
      }
      for (const e of expenses) {
        const key = (e.date || "").substring(0, 7);
        if (map.has(key)) {
          map.get(key)!.expenses += e.amount || 0;
        }
      }
      const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      return Array.from(map.entries()).map(([k, v]) => ({
        label: monthNames[parseInt(k.substring(5)) - 1] || k,
        ...v,
      }));
    }

    if (p === "quarterly") {
      const quarters = ["T1", "T2", "T3", "T4"];
      const byQuarter: Record<string, { revenue: number; profit: number; expenses: number }> = {};
      for (let i = 7; i >= 0; i--) {
        const qIdx = Math.floor(i) % 4;
        const yearOffset = Math.floor(i / 4);
        const y = refDate.getFullYear() - yearOffset;
        const q = quarters[qIdx];
        byQuarter[`${y}-${q}`] = { revenue: 0, profit: 0, expenses: 0 };
      }
      for (const s of sales) {
        const date = s.created_at || "";
        const m = parseInt(date.substring(5, 7));
        const q = quarters[Math.ceil(m / 3) - 1];
        const key = `${date.substring(0, 4)}-${q}`;
        if (byQuarter[key]) {
          byQuarter[key].revenue += s.total || 0;
          byQuarter[key].profit += s.profit || 0;
        }
      }
      for (const e of expenses) {
        const date = e.date || "";
        const m = parseInt(date.substring(5, 7));
        const q = quarters[Math.ceil(m / 3) - 1];
        const key = `${date.substring(0, 4)}-${q}`;
        if (byQuarter[key]) {
          byQuarter[key].expenses += e.amount || 0;
        }
      }
      return Object.entries(byQuarter).map(([k, v]) => ({ label: k, ...v }));
    }

    if (p === "yearly") {
      const byYear: Record<string, { revenue: number; profit: number; expenses: number }> = {};
      for (let i = 4; i >= 0; i--) {
        byYear[String(refDate.getFullYear() - i)] = { revenue: 0, profit: 0, expenses: 0 };
      }
      for (const s of sales) {
        const key = (s.created_at || "").substring(0, 4);
        if (byYear[key]) {
          byYear[key].revenue += s.total || 0;
          byYear[key].profit += s.profit || 0;
        }
      }
      for (const e of expenses) {
        const key = (e.date || "").substring(0, 4);
        if (byYear[key]) {
          byYear[key].expenses += e.amount || 0;
        }
      }
      return Object.entries(byYear).map(([k, v]) => ({ label: k, ...v }));
    }

    return [];
  }

  const today = new Date();

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>;

  const stats = [
    { label: "Ventes du jour", value: `${data.todaySales.toLocaleString()} FCFA`, change: `${data.todaySalesCount} vente(s)`, trend: data.todaySales > 0 ? "up" : "neutral", icon: ShoppingCart },
    { label: "Produits en stock", value: `${data.productsCount}`, change: `${data.lowStock} en alerte`, trend: data.lowStock > 0 ? "down" : "up", icon: Package },
    { label: "Valeur du stock", value: `${data.stockValue.toLocaleString()} FCFA`, change: `${data.productsCount} produits`, trend: "up", icon: Store },
    { label: "Chiffre d'affaires", value: `${data.totalRevenue.toLocaleString()} FCFA`, change: `Bénéfice: ${data.totalProfit.toLocaleString()} FCFA`, trend: "up", icon: DollarSign },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex rounded-lg border p-0.5">
          {(["daily", "weekly", "monthly", "quarterly", "yearly"] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setPeriod(p)}
            >
              {p === "daily" ? "Jour" : p === "weekly" ? "Semaine" : p === "monthly" ? "Mois" : p === "quarterly" ? "Trimestre" : "Année"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover-lift hover:border-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : stat.trend === "down" ? (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  ) : (
                    <Activity className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={`text-xs ${stat.trend === "up" ? "text-emerald-500" : stat.trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4 text-amber-400" />
                Évolution {period === "daily" ? "journalière" : period === "weekly" ? "hebdomadaire" : period === "monthly" ? "mensuelle" : period === "quarterly" ? "trimestrielle" : "annuelle"}
              </CardTitle>
              <CardDescription>Revenus, bénéfices et dépenses</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {data.revenueByPeriod.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Aucune donnée pour cette période</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.revenueByPeriod}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                    formatter={(value) => `${Number(value).toLocaleString()} FCFA`}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#revenueGrad)" name="Revenus" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Bénéfices" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Dépenses" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-amber-400" />
                Répartition paiements
              </CardTitle>
              <CardDescription>Par méthode</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {data.paymentBreakdown.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Aucune donnée</div>
            ) : (
              <div className="space-y-3">
                {data.paymentBreakdown.sort((a, b) => b.value - a.value).slice(0, 5).map((p) => {
                  const total = data.paymentBreakdown.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0";
                  const colors: Record<string, string> = {
                    especes: "bg-emerald-500",
                    orange_money: "bg-orange-500",
                    wave: "bg-blue-500",
                    free_money: "bg-purple-500",
                    carte: "bg-amber-500",
                    transfert: "bg-cyan-500",
                    mixte: "bg-pink-500",
                  };
                  return (
                    <div key={p.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize">{p.name.replace(/_/g, " ")}</span>
                        <span className="font-medium">{p.value.toLocaleString()} FCFA ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colors[p.name] || "bg-amber-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        <Card className="hover-lift hover:border-red-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dépenses du jour</CardTitle>
            <Receipt className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{data.todayExpenses.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground mt-1">Charges quotidiennes</p>
          </CardContent>
        </Card>
        <Card className="hover-lift hover:border-yellow-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Crédits en attente</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{data.pendingCredits.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground mt-1">À recouvrer</p>
          </CardContent>
        </Card>
        <Card className="hover-lift hover:border-emerald-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Résultat net du jour</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.todaySales - data.todayExpenses >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {(data.todaySales - data.todayExpenses).toLocaleString()} FCFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ventes - Dépenses</p>
          </CardContent>
        </Card>
        <Card className="hover-lift hover:border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top produits</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune donnée</div>
            ) : (
              <div className="space-y-1">
                {data.topProducts.slice(0, 4).map((p) => (
                  <div key={p.name} className="flex justify-between text-xs">
                    <span className="truncate max-w-[120px]">{p.name}</span>
                    <span className="font-medium">{p.count} ventes</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Dernières ventes</CardTitle>
              <CardDescription>10 dernières transactions</CardDescription>
            </div>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Aucune vente aujourd'hui</div>
            ) : (
              <div className="space-y-3">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Store className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{sale.client || "Client"} <span className="text-xs text-muted-foreground">par {sale.vendor || "-"}</span></p>
                        <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{sale.total.toLocaleString()} FCFA</p>
                      <p className="text-xs text-emerald-500">+{sale.profit?.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Produits en alerte</CardTitle>
              <CardDescription>Stock bas</CardDescription>
            </div>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Aucun produit en alerte</div>
            ) : (
              <div className="space-y-3">
                {data.lowStockProducts.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.photo ? (
                        <img src={p.photo} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-sm font-medium">{p.name}</p>
                    </div>
                    <span className="text-xs text-red-500 font-bold">{p.stock} / {p.threshold || 10}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
