import { SettingsView } from "@/components/settings/SettingsView";
import { fetchReference } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Starsound Service Board" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [reference, allowed, display] = await Promise.all([
    fetchReference(supabase),
    supabase.from("allowed_users").select("*").order("created_at", { ascending: true }),
    supabase.from("display_settings").select("*").eq("id", 1).single(),
  ]);
  if (allowed.error) throw new Error(`Load users: ${allowed.error.message}`);
  if (display.error) throw new Error(`Load lobby display: ${display.error.message}`);
  return <SettingsView reference={reference} allowedUsers={allowed.data} display={display.data} />;
}
