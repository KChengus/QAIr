import { redirect } from 'next/navigation';

// AUTH DISABLED FOR NOW — this page is inert and bounces to the app root.
// To restore, delete the redirect and uncomment the original below.

// 'use client';
// import dynamic from 'next/dynamic';
// const LoginForm = dynamic(() => import('./LoginForm'), { ssr: false });
// export default function LoginPage() {
//   return <LoginForm />;
// }

export default function LoginPage() {
  redirect('/');
}
