import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Only allow same-site relative paths as post-login destinations. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

/** Public origin for redirects: configured site URL, else the proxied host, else the request origin. */
export function resolveOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export function friendlyAuthError(message: string): string {
  if (/code verifier/i.test(message)) {
    return "Open the sign-in link in the same browser you requested it from, or request a new link below.";
  }
  if (/expired|invalid|already/i.test(message)) {
    return "That sign-in link has expired or was already used. Request a new one.";
  }
  return message;
}

/**
 * Handles both magic-link styles:
 *  - PKCE: /auth/callback?code=...           (default Supabase email template)
 *  - Token hash: /auth/confirm?token_hash=...&type=magiclink  (template using {{ .TokenHash }})
 */
export async function handleAuthCallback(request: NextRequest) {
  const url = new URL(request.url);
  const origin = resolveOrigin(request);
  const next = safeNextPath(url.searchParams.get("next"));
  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`, { status: 303 });

  const errorDescription = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (errorDescription) return fail(friendlyAuthError(errorDescription));

  const supabase = await createClient();

  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(friendlyAuthError(error.message));
    return NextResponse.redirect(`${origin}${next}`, { status: 303 });
  }

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail(friendlyAuthError(error.message));
    return NextResponse.redirect(`${origin}${next}`, { status: 303 });
  }

  return fail("That sign-in link is missing its code. Request a new one.");
}
