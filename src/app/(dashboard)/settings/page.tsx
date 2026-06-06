"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { getShopId, getCurrentUser } from "@/lib/security";
import {
  Building,
  Save,
  LogOut,
  ImagePlus,
  Lock,
  Shield,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Shop } from "@/types";

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const shopId = await getShopId();
    if (!shopId) { setLoading(false); return; }
    const { data } = await supabase.from("shops").select("*").eq("id", shopId).single();
    if (data) setShop(data as Shop);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const saveShop = async () => {
    if (!shop) return;
    setSaving(true);
    await supabase.from("shops").update({
      name: shop.name,
      phone: shop.phone,
      address: shop.address,
      email: shop.email,
      ninea: shop.ninea,
      rccm: shop.rccm,
      currency: shop.currency,
    }).eq("id", shop.id);
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "erp_products");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/demo/image/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) {
        await supabase.from("shops").update({ logo: data.secure_url }).eq("id", shop.id);
        setShop({ ...shop, logo: data.secure_url });
      }
    } catch {}
  };

  const updatePin = async () => {
    setPinError("");
    setPinSuccess(false);
    const user = await getCurrentUser();
    if (!user) return;
    if (pin !== user.pin) { setPinError("Code secret actuel incorrect"); return; }
    if (newPin.length < 4) { setPinError("Le code doit contenir au moins 4 caractères"); return; }
    if (newPin !== confirmPin) { setPinError("Les codes ne correspondent pas"); return; }
    await supabase.from("users").update({ pin: newPin }).eq("id", user.id);
    setPinSuccess(true);
    setPin("");
    setNewPin("");
    setConfirmPin("");
    setTimeout(() => setPinSuccess(false), 3000);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      {success && (
        <Alert className="border-emerald-500/50">
          <Check className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-emerald-500">Paramètres enregistrés</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="shop">
        <TabsList>
          <TabsTrigger value="shop"><Building className="h-4 w-4 mr-1" /> Boutique</TabsTrigger>
          <TabsTrigger value="security"><Lock className="h-4 w-4 mr-1" /> Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations boutique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 mb-4">
                {shop?.logo ? (
                  <img src={shop.logo} alt="Logo" className="h-16 w-16 rounded-lg object-cover border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                    <Building className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <Label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                  <ImagePlus className="h-4 w-4" />
                  {shop?.logo ? "Changer le logo" : "Ajouter un logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nom de la boutique *</Label>
                  <Input value={shop?.name || ""} onChange={(e) => setShop(shop ? { ...shop, name: e.target.value } : null)} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={shop?.phone || ""} onChange={(e) => setShop(shop ? { ...shop, phone: e.target.value } : null)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={shop?.email || ""} onChange={(e) => setShop(shop ? { ...shop, email: e.target.value } : null)} />
                </div>
                <div className="col-span-2">
                  <Label>Adresse</Label>
                  <Input value={shop?.address || ""} onChange={(e) => setShop(shop ? { ...shop, address: e.target.value } : null)} />
                </div>
                <div>
                  <Label>NINEA</Label>
                  <Input value={shop?.ninea || ""} onChange={(e) => setShop(shop ? { ...shop, ninea: e.target.value } : null)} />
                </div>
                <div>
                  <Label>RCCM</Label>
                  <Input value={shop?.rccm || ""} onChange={(e) => setShop(shop ? { ...shop, rccm: e.target.value } : null)} />
                </div>
                <div>
                  <Label>Monnaie</Label>
                  <Input value={shop?.currency || "FCFA"} onChange={(e) => setShop(shop ? { ...shop, currency: e.target.value } : null)} />
                </div>
              </div>
              <Button onClick={saveShop} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Code secret
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Le code secret protège les actions sensibles : suppression, modification, ajustement de stock, fermeture de caisse.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pinSuccess && (
                <Alert className="border-emerald-500/50">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <AlertDescription className="text-emerald-500">Code secret mis à jour</AlertDescription>
                </Alert>
              )}
              {pinError && (
                <Alert variant="destructive"><AlertDescription>{pinError}</AlertDescription></Alert>
              )}
              <div>
                <Label>Code actuel</Label>
                <div className="relative">
                  <Input type={showPin ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} className="tracking-widest pr-10" />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPin(!showPin)}>
                    {showPin ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Nouveau code (4-6 chiffres)</Label>
                <Input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={6} className="tracking-widest" />
              </div>
              <div>
                <Label>Confirmer le nouveau code</Label>
                <Input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} maxLength={6} className="tracking-widest" />
              </div>
              <Button onClick={updatePin}>
                <Lock className="h-4 w-4 mr-2" /> Changer le code secret
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Actions protégées</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1 border-b">
                  <span>Suppression produit</span>
                  <Lock className="h-3 w-3 text-amber-500" />
                </div>
                <div className="flex items-center justify-between py-1 border-b">
                  <span>Modification produit</span>
                  <Lock className="h-3 w-3 text-amber-500" />
                </div>
                <div className="flex items-center justify-between py-1 border-b">
                  <span>Ajustement de stock</span>
                  <Lock className="h-3 w-3 text-amber-500" />
                </div>
                <div className="flex items-center justify-between py-1 border-b">
                  <span>Suppression vente</span>
                  <Lock className="h-3 w-3 text-amber-500" />
                </div>
                <div className="flex items-center justify-between py-1 border-b">
                  <span>Fermeture de caisse</span>
                  <Lock className="h-3 w-3 text-amber-500" />
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Paramètres système</span>
                  <Lock className="h-3 w-3 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Compte</CardTitle></CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" /> Déconnexion
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
