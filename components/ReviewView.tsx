'use client';

import { useState } from 'react';
import { ParsedQuestion } from '@/lib/types';

interface Props {
  questions: ParsedQuestion[];
  sourceContext: string;
  onStart: (enabled: ParsedQuestion[]) => void;
  onBack: () => void;
}

export default function ReviewView({ questions, sourceContext, onStart, onBack }: Props) {
  const [deck, setDeck] = useState<ParsedQuestion[]>(questions);

  const toggle = (id: string) =>
    setDeck((prev) => prev.map((q) => (q.id === id ? { ...q, enabled: !q.enabled } : q)));

  const enabledCount = deck.filter((q) => q.enabled).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900">Review Your Deck</h2>
        <span className="ml-auto text-sm text-gray-500">
          {enabledCount} of {deck.length} questions selected
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Questions panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded text-xs flex items-center justify-center font-bold">Q</span>
            Extracted Questions
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {deck.map((q, i) => (
              <label
                key={q.id}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  q.enabled ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={q.enabled}
                  onChange={() => toggle(q.id)}
                  className="mt-0.5 accent-blue-600"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium text-gray-400 mr-1">{i + 1}.</span>
                  {q.text}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Context panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded text-xs flex items-center justify-center font-bold">S</span>
            Source Material
          </h3>
          {sourceContext ? (
            <p className="text-sm text-gray-600 whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">
              {sourceContext}
            </p>
          ) : (
            <div className="text-sm text-gray-400 italic text-center py-8">
              No source context detected. AI will use general knowledge for grading.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onStart(deck.filter((q) => q.enabled))}
          disabled={enabledCount === 0}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Start Study Session ({enabledCount} questions)
        </button>
      </div>
    </div>
  );
}
