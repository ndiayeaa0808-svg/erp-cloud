import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useRequirePermission(perm: string) {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("users").select("role, perms").eq("id", user.id).single();
      if (!data) { router.push("/login"); return; }
      if (data.role === "admin") return;
      if (!data.perms?.[perm]) router.push("/");
    };
    check();
  }, [perm, router]);
}
