import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isPublicPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/login/reset' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/website')
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  let user: { id: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Stale / rotated refresh tokens should not 500 the whole app.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      user = null;
    } else {
      user = data.user;
    }
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === '/login';
  const isReset = pathname === '/login/reset';
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.');

  if (isPublicAsset) {
    return supabaseResponse;
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  // Signed-in users visiting /login go home — but keep /login/reset for recovery
  if (user && isLogin && !isReset) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  return supabaseResponse;
}
