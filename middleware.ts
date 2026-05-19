import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH DISABLED FOR NOW
// The Supabase session-refresh + route-protection middleware is commented out.
// `config.matcher` is an empty array so this middleware never runs. To restore
// auth, uncomment the block below and restore the original matcher.
// ─────────────────────────────────────────────────────────────────────────────

// import { createServerClient } from '@supabase/ssr';
//
// export async function middleware(request: NextRequest) {
//   let supabaseResponse = NextResponse.next({ request });
//
//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll();
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
//           supabaseResponse = NextResponse.next({ request });
//           cookiesToSet.forEach(({ name, value, options }) =>
//             supabaseResponse.cookies.set(name, value, options)
//           );
//         },
//       },
//     }
//   );
//
//   const { data: { user } } = await supabase.auth.getUser();
//
//   if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
//     return NextResponse.redirect(new URL('/auth/login', request.url));
//   }
//
//   if (
//     user &&
//     (request.nextUrl.pathname === '/auth/login' ||
//       request.nextUrl.pathname === '/auth/signup')
//   ) {
//     return NextResponse.redirect(new URL('/dashboard', request.url));
//   }
//
//   return supabaseResponse;
// }
//
// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
// };

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

// Empty matcher → middleware never executes while auth is disabled.
export const config = {
  matcher: [],
};
