'use client';

import { useState } from 'react';
import { StudyResult } from '@/lib/types';

interface Props {
  results: StudyResult[];
  onReset: () => void;
  onGenerateMore: () => Promise<void>;
}

const STATUS_BADGE: Record<string, string> = {
  'Fully Correct': 'bg-emerald-100 text-emerald-700',
  'Partially Correct': 'bg-amber-100 text-amber-700',
  Misconception: 'bg-orange-100 text-orange-700',
  'Off Topic': 'bg-red-100 text-red-700',
};

export default function CompletedView({ results, onReset, onGenerateMore }: Props) {
  const [generatingMore, setGeneratingMore] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateMore = async () => {
    setGeneratingMore(true);
    setError('');
    try {
      await onGenerateMore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate new questions');
      setGeneratingMore(false);
    }
  };
  const avg = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.grading.score, 0) / results.length)
    : 0;

  const fullyCorrect = results.filter((r) => r.grading.status === 'Fully Correct').length;
  const needsWork = results.filter((r) =>
    ['Misconception', 'Off Topic'].includes(r.grading.status)
  ).length;

  const scoreColor =
    avg >= 80 ? 'text-emerald-600' : avg >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className={`text-6xl font-bold mb-2 ${scoreColor}`}>{avg}%</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Session Complete</h2>
        <p className="text-gray-500">
          {avg >= 80
            ? 'Excellent work! You have a strong understanding.'
            : avg >= 60
            ? 'Good effort. Review the concepts you missed.'
            : 'Keep studying — revisit the source material and try again.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Questions', value: results.length, color: 'text-gray-700' },
          { label: 'Fully Correct', value: fullyCorrect, color: 'text-emerald-600' },
          { label: 'Needs Work', value: needsWork, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-question results */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {results.map((r, i) => (
          <div key={i} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <p className="text-sm font-medium text-gray-800 flex-1">
                <span className="text-gray-400 mr-2">{i + 1}.</span>
                {r.question}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.grading.status]}`}>
                  {r.grading.status}
                </span>
                <span className="text-sm font-bold text-gray-700">{r.grading.score}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 ml-5">{r.grading.feedback}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 text-center">
          {error}
        </p>
      )}

      <div className="mt-8 flex justify-center gap-4">
        <button
          onClick={handleGenerateMore}
          disabled={generatingMore}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {generatingMore ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating...
            </>
          ) : (
            'Generate More Questions'
          )}
        </button>
        <button
          onClick={onReset}
          className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          New Deck
        </button>
      </div>
    </div>
  );
}
