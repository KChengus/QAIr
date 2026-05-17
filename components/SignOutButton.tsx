'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-500 hover:text-red-600 transition-colors"
    >
      Sign Out
    </button>
  );
}
