'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        Dashboard
      </Link>
      <button
        onClick={handleSignOut}
        className="text-sm text-gray-500 hover:text-red-600 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
