import { redirect } from "next/navigation";
import { CurrentUserProvider } from "@/components/CurrentUserProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { initialsFor } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/login");

  const userId = claims.sub;
  const email = typeof claims.email === "string" ? claims.email : "";

  const [allowedRes, profileRes] = await Promise.all([
    supabase.rpc("is_allowed"),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
  ]);

  if (allowedRes.data !== true) {
    return <NoAccess email={email} />;
  }

  const profile = profileRes.data;
  let personName: string | null = null;
  let personInitials: string | null = null;
  if (profile?.person_id) {
    const { data: person } = await supabase
      .from("people")
      .select("name, initials")
      .eq("id", profile.person_id)
      .maybeSingle();
    personName = person?.name ?? null;
    personInitials = person?.initials ?? null;
  }

  const displayName = personName ?? profile?.display_name ?? (email ? email.split("@")[0] : "User");
  const user: CurrentUser = {
    id: userId,
    email,
    displayName,
    initials: personInitials ?? initialsFor(displayName),
    personId: profile?.person_id ?? null,
  };

  return (
    <CurrentUserProvider user={user}>
      <ToastProvider>{children}</ToastProvider>
    </CurrentUserProvider>
  );
}

function NoAccess({ email }: { email: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-[420px] rounded-[14px] border border-line-card border-t-2 border-t-accent bg-surface p-6 shadow-[0_18px_48px_rgba(0,0,0,0.55)]">
        <div className="font-heading text-[18px] font-bold tracking-[0.06em] text-ink-bright">
          STARSOUND <span className="text-brand">OS</span>
        </div>
        <h1 className="mt-4 text-[18px] font-semibold text-ink-bright">This account is not on the allowlist</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          You are signed in as <span className="text-ink-value">{email || "an unknown email"}</span>, but that
          address is not allowed to use the Service Board. Ask a teammate to add it under Settings → Users, then
          sign in again.
        </p>
        <form action="/auth/signout" method="post" className="mt-5">
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
