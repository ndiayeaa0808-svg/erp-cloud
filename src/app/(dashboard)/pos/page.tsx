"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { getShopId, getCurrentUser } from "@/lib/security";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Check,
  X,
  Package,
  Percent,
  Receipt,
  Printer,
} from "lucide-react";

interface CartItem {
  product_id: string;
  product_name: string;
  qty: number;
  price: number;
  cost: number;
  total: number;
  stock: number;
  photo?: string;
}

interface Product {
  id: string;
  name: string;
  retail: number;
  wholesale: number;
  stock: number;
  cost: number;
  photo?: string;
  cat?: string;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState("especes");
  const [client, setClient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [priceMode, setPriceMode] = useState<"retail" | "wholesale">("retail");
  const [vendor, setVendor] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerId, setRegisterId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) {
        setVendor(u.name || u.login);
        setVendorId(u.id);
      }
    });
  }, []);

  const loadProducts = useCallback(async () => {
    let query = supabase.from("products").select("*").is("deleted_at", null).order("name");
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query.limit(50);
    if (data) setProducts(data as Product[]);
  }, [search, supabase]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (!vendorId) return;
    supabase.from("cash_registers").select("*").eq("user_id", vendorId).eq("status", "open").single().then(({ data }) => {
      if (data) { setRegisterOpen(true); setRegisterId(data.id); }
    });
  }, [vendorId, supabase]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    const defaultPrice = priceMode === "wholesale" ? product.wholesale : product.retail;
    const price = defaultPrice && defaultPrice > 0 ? defaultPrice : 0;
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((c) =>
          c.product_id === product.id
            ? { ...c, qty: c.qty + 1, total: (c.qty + 1) * c.price }
            : c
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          qty: 1,
          price: price || 0,
          cost: product.cost || 0,
          total: price || 0,
          stock: product.stock,
          photo: product.photo,
        },
      ];
    });
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId
          ? { ...c, price: newPrice, total: c.qty * newPrice }
          : c
      )
    );
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product_id === productId
            ? { ...c, qty: Math.max(0, c.qty + delta), total: Math.max(0, c.qty + delta) * c.price }
            : c
        )
        .filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const profit = cart.reduce((sum, c) => sum + (c.price - c.cost) * c.qty, 0) - discountAmount;

  const handleOpenRegister = async () => {
    const shopId = await getShopId();
    if (!shopId) return;
    const { data, error: regErr } = await supabase.from("cash_registers").insert({
      shop_id: shopId,
      user_id: vendorId,
      user_name: vendor,
      opened_at: new Date().toISOString(),
      initial_amount: 0,
      status: "open",
      device: navigator.userAgent.substring(0, 100),
    }).select().single();
    if (regErr) {
      setError(regErr.message);
      return;
    }
    if (data) { setRegisterOpen(true); setRegisterId(data.id); }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !registerId) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const shopId = await getShopId();
      const invoice = `INV-${Date.now()}`;
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          id: crypto.randomUUID(),
          shop_id: shopId,
          invoice_number: invoice,
          date: new Date().toISOString().split("T")[0],
          client,
          type: priceMode,
          payment,
          total,
          profit,
          discount,
          status: "completed",
          vendor,
          vendor_id: vendor,
          items: cart.map((c) => ({
            product_id: c.product_id,
            product_name: c.product_name,
            qty: c.qty,
            price: c.price,
            cost: c.cost,
            total: c.total,
          })),
        })
        .select()
        .single();
      if (saleErr) throw saleErr;
      for (const item of cart) {
        await supabase.rpc("adjust_stock", {
          p_product_id: item.product_id,
          p_qty_change: -item.qty,
          p_shop_id: shopId,
        });
      }
      if (registerId) {
        const { data: reg } = await supabase.from("cash_registers").select("*").eq("id", registerId).single();
        if (reg) {
          const isCash = payment === "especes";
          await supabase.from("cash_registers").update({
            total_sales: (reg.total_sales || 0) + total,
            total_cash: (reg.total_cash || 0) + (isCash ? total : 0),
            total_mobile: (reg.total_mobile || 0) + (!isCash && ["orange_money", "wave", "free_money"].includes(payment) ? total : 0),
            total_other: (reg.total_other || 0) + (!isCash && !["orange_money", "wave", "free_money"].includes(payment) ? total : 0),
          }).eq("id", registerId);
        }
      }
      setCart([]);
      setClient("");
      setDiscount(0);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la validation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Caisse POS</h1>
        <div className="flex items-center gap-2">
          {!registerOpen ? (
            <Button variant="outline" onClick={handleOpenRegister} className="text-amber-500">
              <Receipt className="h-4 w-4 mr-2" /> Ouvrir la caisse
            </Button>
          ) : (
            <Badge variant="default" className="bg-emerald-500">Caisse ouverte</Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            <ShoppingCart className="h-3 w-3 mr-1" /> {vendor}
          </Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}
      {success && (
        <Alert className="border-emerald-500/50">
          <Check className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-emerald-500">Vente enregistrée !</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex rounded-lg border p-0.5 ml-2">
                <Button
                  variant={priceMode === "retail" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPriceMode("retail")}
                >Détail</Button>
                <Button
                  variant={priceMode === "wholesale" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPriceMode("wholesale")}
                >Gros</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className="text-left rounded-lg border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group"
                >
                  <div className="aspect-square bg-muted relative">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    {p.stock <= 0 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Rupture</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-medium text-xs line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
                    <p className="text-sm font-bold text-amber-400">
                      {(priceMode === "wholesale" ? p.wholesale : p.retail)?.toLocaleString()} FCFA
                    </p>
                  </div>
                </button>
              ))}
              {products.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-8 text-sm">
                  {search ? "Aucun produit trouvé" : "Chargement des produits..."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <CardTitle className="text-base">Panier ({cart.length})</CardTitle>
              </div>
              {!registerOpen && (
                <span className="text-xs text-red-400">Caisse fermée</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 max-h-[30vh] overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-lg border">
                  <div className="h-8 w-8 rounded bg-muted overflow-hidden shrink-0">
                    {item.photo ? (
                      <img src={item.photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <Input
                      type="number"
                      value={item.price || ""}
                      onChange={(e) => updatePrice(item.product_id, Number(e.target.value))}
                      className="h-6 text-xs mt-0.5 w-24"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm font-medium w-16 text-right">{item.total.toLocaleString()}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 shrink-0" onClick={() => removeFromCart(item.product_id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  Cliquez sur un produit pour ajouter
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString()} FCFA</span>
              </div>
              <div className="flex items-center gap-2">
                <Percent className="h-3 w-3 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Remise %"
                  className="h-8 text-xs"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>Remise ({discount}%)</span>
                  <span>-{discountAmount.toLocaleString()} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Total</span>
                <span className="font-bold text-lg">{total.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Marge</span>
                <span>{profit.toLocaleString()} FCFA</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Client</Label>
                <Input placeholder="Nom du client (optionnel)" value={client} onChange={(e) => setClient(e.target.value)} className="h-8 text-sm" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Paiement</Label>
                <Select value={payment} onValueChange={(v) => v && setPayment(v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="free_money">Free Money</SelectItem>
                    <SelectItem value="carte">Carte bancaire</SelectItem>
                    <SelectItem value="transfert">Virement</SelectItem>
                    <SelectItem value="mixte">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={cart.length === 0 || loading || !registerOpen}
              >
                {loading ? "Validation..." : `Valider (${total.toLocaleString()} FCFA)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
