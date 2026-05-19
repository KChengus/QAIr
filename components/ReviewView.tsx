'use client';

import { useState } from 'react';
import { ParsedQuestion } from '@/lib/types';

interface Props {
  questions: ParsedQuestion[];
  onStart: (enabled: ParsedQuestion[]) => void;
  onBack: () => void;
}

export default function ReviewView({ questions, onStart, onBack }: Props) {
  const [deck, setDeck] = useState<ParsedQuestion[]>(questions);

  const toggle = (id: string) =>
    setDeck((prev) => prev.map((q) => (q.id === id ? { ...q, enabled: !q.enabled } : q)));

  const enabledCount = deck.filter((q) => q.enabled).length;
  const allOn = enabledCount === deck.length;

  const setAll = (enabled: boolean) =>
    setDeck((prev) => prev.map((q) => ({ ...q, enabled })));

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Review your deck</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-12">
        Pick the questions you want to study. Toggle off anything that misses the mark.
      </p>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">
          <span className="text-blue-600 font-bold">{enabledCount}</span> of {deck.length} selected
        </span>
        <button
          onClick={() => setAll(!allOn)}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          {allOn ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Question cards */}
      <div className="space-y-2.5">
        {deck.map((q, i) => (
          <label
            key={q.id}
            className={`group flex items-start gap-4 p-4 rounded-2xl cursor-pointer border transition-all ${
              q.enabled
                ? 'bg-white border-blue-200 shadow-sm hover:border-blue-300'
                : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-80'
            }`}
          >
            <span
              className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                q.enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-gray-700 leading-relaxed pt-0.5">
              {q.text}
            </span>
            <input
              type="checkbox"
              checked={q.enabled}
              onChange={() => toggle(q.id)}
              className="mt-1 w-4 h-4 accent-blue-600 shrink-0"
            />
          </label>
        ))}
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur-sm pt-4 pb-3 mt-6">
        <button
          onClick={() => onStart(deck.filter((q) => q.enabled))}
          disabled={enabledCount === 0}
          className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {enabledCount === 0
            ? 'Select at least one question'
            : `Start Study Session (${enabledCount} question${enabledCount === 1 ? '' : 's'})`}
        </button>
      </div>
    </div>
  );
}
