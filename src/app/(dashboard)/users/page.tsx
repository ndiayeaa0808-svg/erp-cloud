"use client";

import { useRequirePermission } from "@/lib/use-permission";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { getShopId } from "@/lib/security";
import {
  Plus,
  Search,
  Shield,
  UserCog,
  Lock,
  Check,
  Pencil,
  Ban,
  CheckCheck,
  Trash2,
} from "lucide-react";

interface AppUser {
  id: string;
  email: string;
  name: string;
  login: string;
  role: string;
  perms: Record<string, boolean>;
  is_blocked: boolean;
  created_at: string;
}

const ROLES = [
  { value: "admin", label: "Admin", desc: "Accès complet à toutes les fonctionnalités" },
  { value: "caissier", label: "Caissier", desc: "Ventes, caisse, consultation des produits" },
  { value: "gestionnaire_stock", label: "Gestionnaire Stock", desc: "Produits, stock, inventaire" },
  { value: "comptable", label: "Comptable", desc: "Rapports, comptabilité, crédits" },
];

const DEFAULT_PERMS: Record<string, boolean> = {
  dashboard: true,
  pos: false,
  products: false,
  products_edit: false,
  products_delete: false,
  sales: false,
  sales_delete: false,
  credits: false,
  clients: false,
  expenses: false,
  reports: false,
  cash_register: false,
  cash_register_close: false,
  invoices: false,
  users: false,
  users_edit: false,
  settings: false,
  employees: false,
};

const ROLE_PERMS: Record<string, Record<string, boolean>> = {
  admin: Object.fromEntries(Object.keys(DEFAULT_PERMS).map((k) => [k, true])),
  caissier: { pos: true, products: true, sales: true, clients: true, cash_register: true, invoices: true, credits: true },
  gestionnaire_stock: { products: true, products_edit: true, reports: true, expenses: true },
  comptable: { sales: true, credits: true, reports: true, clients: true, expenses: true, cash_register: true, invoices: true, employees: true },
};

export default function UsersPage() {
  useRequirePermission("users");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [edit, setEdit] = useState<Partial<AppUser>>({});
  const [open, setOpen] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    setLoading(true);
    const shopId = await getShopId();
    if (!shopId) { setLoading(false); return; }
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (data) setUsers(data as AppUser[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const [initPassword, setInitPassword] = useState("");

  const openEdit = (user?: AppUser) => {
    if (user) {
      setEdit(user);
      setSelectedPerms(user.perms || { ...DEFAULT_PERMS, ...ROLE_PERMS[user.role] });
    } else {
      setEdit({ name: "", login: "", email: "", role: "caissier", is_blocked: false });
      setSelectedPerms({ ...DEFAULT_PERMS, ...ROLE_PERMS.caissier });
    }
    setInitPassword("");
    setOpen(true);
  };

  const handleRoleChange = (role: string | null) => {
    if (!role) return;
    setEdit({ ...edit, role });
    setSelectedPerms({ ...DEFAULT_PERMS, ...(ROLE_PERMS[role] || {}) });
  };

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setError(null);
    setSuccess(false);
    try {
      const shopId = await getShopId();
      if (edit.id) {
        await supabase.from("users").update({
          name: edit.name,
          role: edit.role,
          perms: selectedPerms,
          is_blocked: edit.is_blocked,
        }).eq("id", edit.id).eq("shop_id", shopId);
      } else {
        const res = await fetch("/api/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: edit.login,
            password: initPassword || "123456",
            name: edit.name,
            role: edit.role || "caissier",
            shopId,
            perms: selectedPerms,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur création");
      }
      setOpen(false);
      setEdit({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const toggleBlock = async (userId: string, blocked: boolean) => {
    const shopId = await getShopId();
    await supabase.from("users").update({ is_blocked: blocked }).eq("id", userId).eq("shop_id", shopId);
    load();
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    const shopId = await getShopId();
    await supabase.from("cash_registers").update({ status: "closed", closed_at: new Date().toISOString(), note: "Utilisateur supprimé" }).eq("shop_id", shopId).eq("user_id", deleteTarget).eq("status", "open");
    const { error } = await supabase.from("users").delete().eq("id", deleteTarget).eq("shop_id", shopId);
    if (error) console.error("Delete user error:", error);
    setDeleteTarget(null);
    load();
  };

  const permissionLabels: Record<string, string> = {
    dashboard: "Tableau de bord",
    pos: "Caisse POS",
    products: "Voir produits",
    products_edit: "Modifier produits",
    products_delete: "Supprimer produits",
    sales: "Voir ventes",
    sales_delete: "Supprimer ventes",
    credits: "Gérer crédits",
    clients: "Gérer clients",
    expenses: "Gérer dépenses",
    reports: "Rapports",
    cash_register: "Caisse journalière",
    cash_register_close: "Fermeture caisse",
    invoices: "Facturation",
    users: "Voir utilisateurs",
    users_edit: "Modifier utilisateurs",
    settings: "Paramètres",
    employees: "Employés",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button onClick={() => openEdit()}><Plus className="h-4 w-4 mr-2" /> Nouvel utilisateur</Button>} />
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{edit.id ? "Modifier" : "Nouvel"} utilisateur</DialogTitle>
            </DialogHeader>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nom *</Label>
                  <Input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                </div>
                <div>
                  <Label>Login *</Label>
                  <Input value={edit.login || ""} onChange={(e) => setEdit({ ...edit, login: e.target.value })} disabled={!!edit.id} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={edit.email || ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
                </div>
                {!edit.id && (
                  <div>
                    <Label>Mot de passe initial</Label>
                    <Input type="password" value={initPassword} onChange={(e) => setInitPassword(e.target.value)} placeholder="123456" />
                  </div>
                )}
                <div>
                  <Label>Rôle</Label>
                  <Select value={edit.role || "caissier"} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Permissions</p>
                <div className="space-y-1">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between py-1 text-sm cursor-pointer hover:bg-muted/50 rounded px-1">
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={!!selectedPerms[key]}
                        onChange={() => togglePerm(key)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={save} className="w-full">
                {edit.id ? "Enregistrer" : "Créer l'utilisateur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="border-emerald-500/50">
          <Check className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-emerald-500">Utilisateur enregistré</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscrit le</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Chargement...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                <UserCog className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucun utilisateur
              </TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-xs">{u.login}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? <><Shield className="h-3 w-3 inline mr-1" />Admin</> : ROLES.find((r) => r.value === u.role)?.label || u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.is_blocked ? (
                    <Badge variant="destructive">Bloqué</Badge>
                  ) : (
                    <Badge variant="default" className="bg-emerald-500">Actif</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(u.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${u.is_blocked ? "text-emerald-400" : "text-red-400"}`}
                      onClick={() => toggleBlock(u.id, !u.is_blocked)}
                    >
                      {u.is_blocked ? <CheckCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => setDeleteTarget(u.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement cet utilisateur. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
