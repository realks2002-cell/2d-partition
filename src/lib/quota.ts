import { createServerClient } from "./supabase";

export type QuotaReason =
  | "signup_bonus"
  | "render"
  | "refund"
  | "purchase"
  | "admin_grant"
  | "admin_revoke";

export interface PlanDef {
  id: "standard" | "pro" | "premium";
  name: string;
  price: number;
  quota: number;
}

export const PLANS: Record<PlanDef["id"], PlanDef> = {
  standard: { id: "standard", name: "스탠다드", price: 10000, quota: 30 },
  pro: { id: "pro", name: "프로", price: 30000, quota: 115 },
  premium: { id: "premium", name: "프리미엄", price: 50000, quota: 200 },
};

export const SIGNUP_BONUS = 5;

export class InsufficientQuotaError extends Error {
  constructor() {
    super("insufficient_quota");
    this.name = "InsufficientQuotaError";
  }
}

export async function getQuota(userId: number): Promise<number> {
  const sb = createServerClient();
  const { data } = await sb
    .from("partiApp_users")
    .select("render_quota")
    .eq("id", userId)
    .single();
  return data?.render_quota ?? 0;
}

export async function consumeQuota(
  userId: number,
  amount: number,
  meta?: Record<string, unknown>,
): Promise<number> {
  if (amount <= 0) throw new Error("amount must be positive");
  const sb = createServerClient();

  const { data, error } = await sb.rpc("consume_render_quota", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    if (error.message?.includes("insufficient_quota")) {
      throw new InsufficientQuotaError();
    }
    throw error;
  }

  const balance = data as number;
  await sb.from("partiApp_quota_logs").insert({
    user_id: userId,
    delta: -amount,
    reason: "render",
    balance_after: balance,
    meta: meta ?? null,
  });

  return balance;
}

export async function grantQuota(
  userId: number,
  amount: number,
  reason: QuotaReason,
  meta?: Record<string, unknown>,
): Promise<number> {
  if (amount === 0) throw new Error("amount must be non-zero");
  const sb = createServerClient();

  const { data, error } = await sb.rpc("grant_render_quota", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) throw error;
  const balance = data as number;

  await sb.from("partiApp_quota_logs").insert({
    user_id: userId,
    delta: amount,
    reason,
    balance_after: balance,
    meta: meta ?? null,
  });

  return balance;
}
