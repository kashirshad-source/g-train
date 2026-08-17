import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";

const PUBLIC_PATHS = ["/", "/auth/callback", "/auth/auth-code-error"];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path) || path.startsWith("/invite/");

  // Public routes never branch on auth state below, so skip the Supabase
  // round trip entirely instead of paying for a getUser() call whose result
  // would just be discarded — this is the landing page and every invite
  // link, so it matters most for first-time, logged-out visitors.
  if (isPublic) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (path !== "/onboarding" && path !== "/change-password") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_role, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.default_role) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (profile.must_change_password) {
      const url = request.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: return supabaseResponse as-is so the auth cookies it set
  // are preserved on the response sent back to the browser.
  return supabaseResponse;
}
