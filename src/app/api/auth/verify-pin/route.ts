import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, pin } = await request.json();
    if (!userId || !pin) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRole) {
      return NextResponse.json({ valid: false }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data } = await adminClient
      .from("users")
      .select("pin")
      .eq("id", userId)
      .single();

    return NextResponse.json({ valid: data?.pin === pin });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
