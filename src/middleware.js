import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // 1. Set up the server response - start with a basic next response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Wake up the Supabase Server Client with proper cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          // Get all cookies from the request
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 3. Check the local session cookies instead of making a network round-trip
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // 🕵️ THE SNITCH: This will print in your VS Code terminal!
  console.log("Middleware sees user:", user?.email, " | ID:", user?.id);

  // 4. THE VAULT DOOR LOGIC
  if (request.nextUrl.pathname.startsWith('/admin')) {
    
    // Switch this to use your exact Admin UID instead of the email
    if (!user || user.id !== '21e83cc3-8ea8-4eeb-900e-c1dd92784391') {
      
      console.log("🚨 Bouncer triggered! Kicking user out.");
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

// 5. Tell Next.js exactly which routes this bouncer needs to watch
export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
