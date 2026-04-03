'use client';

import { useState, useRef } from 'react';
import { ParsedQuestion, GradingResult, StudyResult } from '@/lib/types';

interface Props {
  questions: ParsedQuestion[];
  sourceContext: string;
  sourceGrounded: boolean;
  onComplete: (results: StudyResult[]) => void;
}

const STATUS_BG: Record<string, string> = {
  'Fully Correct': 'bg-emerald-500',
  'Partially Correct': 'bg-amber-500',
  Misconception: 'bg-orange-500',
  'Off Topic': 'bg-red-500',
};

const STATUS_CELL: Record<string, string> = {
  'Fully Correct': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Partially Correct': 'bg-amber-100 text-amber-700 border-amber-300',
  Misconception: 'bg-orange-100 text-orange-700 border-orange-300',
  'Off Topic': 'bg-red-100 text-red-700 border-red-300',
};

const STATUS_BADGE: Record<string, string> = {
  'Fully Correct': 'bg-emerald-100 text-emerald-700',
  'Partially Correct': 'bg-amber-100 text-amber-700',
  Misconception: 'bg-orange-100 text-orange-700',
  'Off Topic': 'bg-red-100 text-red-700',
};

export default function StudyView({ questions, sourceContext, sourceGrounded, onComplete }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [grades, setGrades] = useState<GradingResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const [speechError, setSpeechError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const updateAnswer = (idx: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const toggleRecording = (idx: number) => {
    if (recordingIdx === idx) {
      recognitionRef.current?.stop();
      setRecordingIdx(null);
      return;
    }
    if (recordingIdx !== null) {
      recognitionRef.current?.stop();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setSpeechError('Voice input is not supported in this browser. Use Chrome or Edge for speech recognition.');
      return;
    }

    setSpeechError('');
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setAnswers((prev) => {
        const next = [...prev];
        next[idx] = prev[idx] ? prev[idx] + ' ' + transcript : transcript;
        return next;
      });
    };
    recognition.onerror = () => setRecordingIdx(null);
    recognition.onend = () => setRecordingIdx(null);
    recognition.start();
    recognitionRef.current = recognition;
    setRecordingIdx(idx);
  };

  const submitAll = async () => {
    setLoading(true);
    setError('');

    const pairs = questions.map((q, i) => ({
      question: q.text,
      userAnswer: answers[i],
    }));

    try {
      const res = await fetch('/api/grade-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs, sourceContext: sourceGrounded ? sourceContext : '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grading failed');
      setGrades(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (!grades) return;
    const results: StudyResult[] = questions.map((q, i) => ({
      question: q.text,
      userAnswer: answers[i],
      grading: grades[i],
    }));
    onComplete(results);
  };

  const scrollToQuestion = (idx: number) => {
    questionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setExpandedQ(idx);
  };

  const answeredCount = answers.filter((a) => a.trim()).length;
  const avgScore = grades
    ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Question number grid — always visible */}
      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm pb-4 pt-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">
            {grades ? 'Results' : 'Answer All Questions'}
          </h2>
          <span className="text-sm text-gray-500">
            {grades
              ? `Average: ${avgScore}%`
              : `${answeredCount} / ${questions.length} answered`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => {
            const grade = grades?.[i];
            const hasAnswer = answers[i].trim().length > 0;
            const cellClass = grade
              ? `${STATUS_CELL[grade.status]} border font-bold`
              : hasAnswer
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-white text-gray-400 border border-gray-200';

            return (
              <button
                key={i}
                onClick={() => scrollToQuestion(i)}
                className={`w-9 h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-all hover:scale-110 ${cellClass}`}
                title={grade ? `Q${i + 1}: ${grade.score}% — ${grade.status}` : `Question ${i + 1}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        {grades && (
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Correct</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Partial</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block" /> Misconception</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Off Topic</span>
          </div>
        )}
      </div>

      {/* Questions list */}
      <div className="space-y-4 mt-2">
        {questions.map((q, i) => {
          const grade = grades?.[i];
          const isExpanded = expandedQ === i;

          return (
            <div
              key={q.id}
              ref={(el) => { questionRefs.current[i] = el; }}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                grade
                  ? `border-l-4 ${grade.score >= 85 ? 'border-l-emerald-500' : grade.score >= 50 ? 'border-l-amber-500' : 'border-l-red-500'} border-gray-200`
                  : 'border-gray-200'
              }`}
            >
              {/* Question header */}
              <div className="p-5 pb-3">
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                    grade ? STATUS_BG[grade.status] + ' text-white' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-gray-800 pt-0.5 flex-1">{q.text}</p>
                  {grade && (
                    <span className="shrink-0 text-sm font-bold text-gray-700">{grade.score}%</span>
                  )}
                </div>
              </div>

              {/* Answer input (pre-grading) */}
              {!grades && (
                <div className="px-5 pb-5">
                  <div className="relative">
                    <textarea
                      value={answers[i]}
                      onChange={(e) => updateAnswer(i, e.target.value)}
                      placeholder="Type your answer..."
                      rows={3}
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-300 p-3 pr-12 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-60"
                    />
                    <button
                      onClick={() => toggleRecording(i)}
                      disabled={loading}
                      title={recordingIdx === i ? 'Stop recording' : 'Dictate answer'}
                      className={`absolute right-2.5 top-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        recordingIdx === i
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                      </svg>
                    </button>
                  </div>
                  {recordingIdx === i && (
                    <p className="mt-1 text-xs text-red-500 font-medium">Listening...</p>
                  )}
                </div>
              )}

              {/* Grading result (post-grading) */}
              {grade && (
                <div className="px-5 pb-4">
                  {/* Status + your answer */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[grade.status]}`}>
                      {grade.status}
                    </span>
                  </div>
                  {answers[i].trim() && (
                    <p className="text-xs text-gray-500 mb-2">
                      <span className="font-medium">Your answer:</span> {answers[i]}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mb-2">{grade.feedback}</p>

                  {/* Expandable details */}
                  <button
                    onClick={() => setExpandedQ(isExpanded ? null : i)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    {isExpanded ? 'Hide details' : 'Show details'}
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="font-medium text-gray-700 mb-1">Correct Answer</p>
                        <p className="text-gray-600">{grade.correctAnswer}</p>
                      </div>
                      {grade.missingConcepts.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="font-medium text-gray-700 mb-1">Missing Concepts</p>
                          <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                            {grade.missingConcepts.map((c, ci) => <li key={ci}>{c}</li>)}
                          </ul>
                        </div>
                      )}
                      {grade.score < 80 && grade.eli5Explanation && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="font-medium text-gray-700 mb-1">Simplified Explanation</p>
                          <p className="text-gray-600">{grade.eli5Explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur-sm pt-4 pb-2 mt-6">
        {speechError && (
          <p className="mb-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2">{speechError}</p>
        )}
        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
        )}

        {!grades ? (
          <button
            onClick={submitAll}
            disabled={answeredCount === 0 || loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Grading all answers...
              </>
            ) : (
              `Submit All Answers (${answeredCount}/${questions.length})`
            )}
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors"
          >
            View Full Summary
          </button>
        )}
      </div>
    </div>
  );
}
