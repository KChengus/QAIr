import { redirect } from 'next/navigation';

// AUTH DISABLED FOR NOW — this page is inert and bounces to the app root.
// To restore, delete the redirect and uncomment the original below.

// 'use client';
// import dynamic from 'next/dynamic';
// const SignupForm = dynamic(() => import('./SignupForm'), { ssr: false });
// export default function SignupPage() {
//   return <SignupForm />;
// }

export default function SignupPage() {
  redirect('/');
}
