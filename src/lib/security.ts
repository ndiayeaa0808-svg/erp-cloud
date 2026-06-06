import { createClient } from "@/lib/supabase/client";

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("pin")
    .eq("id", userId)
    .single();
  return data?.pin === pin;
}

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: appUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  return appUser;
}

export async function getShopId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const fromMeta = user.user_metadata?.shop_id || user.app_metadata?.shop_id;
  if (fromMeta) return fromMeta;
  const { data: u } = await supabase.from("users").select("shop_id").eq("id", user.id).single();
  return u?.shop_id || null;
}

export async function logAudit(params: {
  action: string;
  entity: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const shopId = await getShopId();
  await supabase.from("audit_logs").insert({
    shop_id: shopId,
    user_id: user.id,
    user_name: user.email,
    action: params.action,
    entity: params.entity,
    entity_id: params.entity_id,
    data: params.data,
  });
}

export async function requirePinAction(
  userId: string,
  pin: string,
  action: string,
  entity: string,
  entityId?: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  const valid = await verifyPin(userId, pin);
  if (valid) {
    await logAudit({ action, entity, entity_id: entityId, data });
  }
  return valid;
}

export async function getShopInfo() {
  const supabase = createClient();
  const shopId = await getShopId();
  if (!shopId) return null;
  const { data } = await supabase.from("shops").select("*").eq("id", shopId).single();
  return data;
}
