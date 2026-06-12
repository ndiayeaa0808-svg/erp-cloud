"use client";

import { createSaleOffline, createCreditOffline, refreshCache, checkPendingWrites } from "./sync";
import { getCachedProducts } from "./db";

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

export interface OfflineCheckoutResult {
  success: boolean;
  offline: boolean;
  error?: string;
  saleId?: string;
  invoiceNumber?: string;
  stockErrors?: string[];
}

export async function checkoutOffline(params: {
  cart: CartItem[];
  client: string;
  clientPhone: string;
  payment: string;
  paymentType: string;
  total: number;
  paidAmount: number;
  profit: number;
  discount: number;
  vendor: string;
  vendorId: string;
  shopId: string;
}): Promise<OfflineCheckoutResult> {
  const saleId = crypto.randomUUID();
  const shortId = saleId.substring(0, 8);
  const invoice = `OFF-${shortId.toUpperCase()}`;

  const salePayload: Record<string, unknown> = {
    id: saleId,
    shop_id: params.shopId,
    invoice_number: invoice,
    date: new Date().toISOString().split("T")[0],
    client: params.client || null,
    type: "retail",
    payment: params.payment,
    total: params.total,
    profit: params.profit,
    discount: params.discount,
    status: "completed",
    vendor: params.vendor,
    vendor_id: params.vendorId,
    items: params.cart.map((c) => ({
      product_id: c.product_id,
      product_name: c.product_name,
      qty: c.qty,
      price: c.price,
      cost: c.cost,
      total: c.total,
    })),
    synced_from_offline: true,
  };
  if (params.clientPhone) salePayload.client_phone = params.clientPhone;

  const stockErrors: string[] = [];
  const cachedProducts = await getCachedProducts();

  for (const item of params.cart) {
    const cached = cachedProducts.find((p) => p.id === item.product_id);
    if (!cached) {
      stockErrors.push(`${item.product_name}: produit non trouvé en cache`);
      continue;
    }
    if ((cached.stock || 0) < item.qty) {
      stockErrors.push(`${item.product_name}: stock insuffisant (${cached.stock})`);
    }
  }

  await createSaleOffline(salePayload);

  const remaining = params.total - params.paidAmount;
  if (remaining > 0 && params.client) {
    const creditId = crypto.randomUUID();
    await createCreditOffline({
      id: creditId,
      shop_id: params.shopId,
      sale_id: saleId,
      client: params.client,
      client_phone: params.clientPhone || null,
      total: remaining,
      paid: 0,
      status: "open",
      date: new Date().toISOString().split("T")[0],
      note: `Reliquat vente ${invoice} — Hors-ligne — Vendeur: ${params.vendor}`,
      vendor: params.vendor,
      vendor_id: params.vendorId,
    });
  }

  return {
    success: true,
    offline: true,
    saleId,
    invoiceNumber: invoice,
    stockErrors: stockErrors.length > 0 ? stockErrors : undefined,
  };
}
