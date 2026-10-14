import { SettingsView } from "@/components/settings/SettingsView";
import { fetchReference } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Starsound Service Board" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [reference, allowed] = await Promise.all([
    fetchReference(supabase),
    supabase.from("allowed_users").select("*").order("created_at", { ascending: true }),
  ]);
  if (allowed.error) throw new Error(`Load users: ${allowed.error.message}`);
  return <SettingsView reference={reference} allowedUsers={allowed.data} />;
}
