import { NextResponse } from 'next/server';

// AUTH DISABLED FOR NOW — the OAuth/email code-exchange callback is commented
// out and this route simply redirects to the app root. To restore auth,
// uncomment the original implementation below and remove the stub GET.

// import { createServerClient } from '@supabase/ssr';
// import { cookies } from 'next/headers';
//
// export async function GET(request: Request) {
//   const { searchParams, origin } = new URL(request.url);
//   const code = searchParams.get('code');
//   const next = searchParams.get('next') ?? '/dashboard';
//
//   if (code) {
//     const cookieStore = await cookies();
//     const supabase = createServerClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       {
//         cookies: {
//           getAll() {
//             return cookieStore.getAll();
//           },
//           setAll(cookiesToSet) {
//             cookiesToSet.forEach(({ name, value, options }) =>
//               cookieStore.set(name, value, options)
//             );
//           },
//         },
//       }
//     );
//     const { error } = await supabase.auth.exchangeCodeForSession(code);
//     if (!error) {
//       return NextResponse.redirect(`${origin}${next}`);
//     }
//   }
//
//   return NextResponse.redirect(`${origin}/auth/login?error=Could+not+sign+in`);
// }

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(origin);
}
