import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    return { id: userData.user.id, email: userData.user.email ?? "" };
  }
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user?.sub) redirect("/login");
  return { id: String(user.sub), email: typeof user.email === "string" ? user.email : "" };
}

export async function getCurrentUser() {
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
}
