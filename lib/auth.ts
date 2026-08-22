import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    return { id: userData.user.id, email: userData.user.email ?? "" };
  }
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user?.sub) redirect("/login");
  return { id: String(user.sub), email: typeof user.email === "string" ? user.email : "" };
});

export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      return { id: userData.user.id, email: userData.user.email ?? "" };
    }
    const { data: claimsData } = await supabase.auth.getClaims();
    const user = claimsData?.claims;
    if (user?.sub) {
      return { id: String(user.sub), email: typeof user.email === "string" ? user.email : "" };
    }
    return null;
  } catch {
    return null;
  }
});

