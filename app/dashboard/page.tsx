import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            QAIr
          </div>
          <span className="font-semibold text-gray-900">QuestionAIre</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Study App
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Decks</h1>
            <p className="text-sm text-gray-500 mt-1">Your saved study sessions</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Study Session
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No saved decks yet</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Complete a study session and save your deck — it&apos;ll appear here so you can pick up right where you left off.
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Studying
          </Link>
          <p className="text-xs text-gray-400 mt-4">Deck saving coming soon in the next update</p>
        </div>
      </div>
    </div>
  );
}
