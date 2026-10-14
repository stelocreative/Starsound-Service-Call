import { NextResponse, type NextRequest } from "next/server";
import { resolveOrigin } from "@/lib/auth/callback";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${resolveOrigin(request)}/login`, { status: 303 });
}
