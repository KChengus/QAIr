'use client';

import { useState, useCallback } from 'react';
import { AppView, ParsedQuestion, StudyResult, Difficulty } from '@/lib/types';
import SetupView from '@/components/SetupView';
import ReviewView from '@/components/ReviewView';
import StudyView from '@/components/StudyView';
import CompletedView from '@/components/CompletedView';

export default function Home() {
  const [view, setView] = useState<AppView>('setup');
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [sourceContext, setSourceContext] = useState('');
  const [results, setResults] = useState<StudyResult[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);

  const handleParsed = (qs: ParsedQuestion[], ctx: string, diff: Difficulty) => {
    setQuestions(qs);
    setSourceContext(ctx);
    setDifficulty(diff);
    setView('review');
  };

  const handleStartStudy = (enabled: ParsedQuestion[]) => {
    setQuestions(enabled);
    setResults([]);
    setView('study');
  };

  const handleComplete = (sessionResults: StudyResult[]) => {
    setResults(sessionResults);
    // Accumulate all questions asked so far so the next round avoids them
    setPreviousQuestions((prev) => [
      ...prev,
      ...sessionResults.map((r) => r.question),
    ]);
    setView('complete');
  };

  const handleGenerateMore = useCallback(async () => {
    const res = await fetch('/api/parse-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: sourceContext,
        difficulty,
        previousQuestions,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate questions');

    if (!data.questions?.length) {
      throw new Error('No new questions could be generated from this material.');
    }

    const newQuestions: ParsedQuestion[] = data.questions.map(
      (q: string, i: number) => ({ id: `q-more-${Date.now()}-${i}`, text: q, enabled: true })
    );

    setQuestions(newQuestions);
    setView('review');
  }, [sourceContext, difficulty, previousQuestions]);

  const handleReset = () => {
    setView('setup');
    setQuestions([]);
    setSourceContext('');
    setResults([]);
    setDifficulty('medium');
    setPreviousQuestions([]);
  };

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            QAIr
          </div>
          <span className="font-semibold text-gray-900">QuestionAIre</span>
        </div>
        {view !== 'setup' && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            New Deck
          </button>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {view === 'setup' && <SetupView onParsed={handleParsed} />}
        {view === 'review' && (
          <ReviewView
            questions={questions}
            sourceContext={sourceContext}
            onStart={handleStartStudy}
            onBack={() => setView('setup')}
          />
        )}
        {view === 'study' && (
          <StudyView
            questions={questions}
            sourceContext={sourceContext}
            onComplete={handleComplete}
          />
        )}
        {view === 'complete' && (
          <CompletedView results={results} onReset={handleReset} onGenerateMore={handleGenerateMore} />
        )}
      </div>
    </main>
  );
}
