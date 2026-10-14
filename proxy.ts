import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

const PUBLIC_PREFIXES = ["/login", "/auth/"];

/**
 * Refreshes the Supabase session cookie on every request and gates the app:
 * signed-out visitors go to /login, signed-in visitors skip /login.
 * Allowlist enforcement happens in the database (RLS) and the app layout.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims validates the JWT (locally for asymmetric keys) and refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!signedIn && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const next = pathname + search;
    if (next !== "/") loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  if (signedIn && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    "/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
