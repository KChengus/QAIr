'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [currentIdx, setCurrentIdx] = useState(0);
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const [transcribingIdx, setTranscribingIdx] = useState<number | null>(null);
  const [speechError, setSpeechError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentIdx]);

  const updateAnswer = (idx: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const appendTranscript = (idx: number, transcript: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = prev[idx] ? prev[idx] + ' ' + transcript : transcript;
      return next;
    });
  };

  const stopActiveRecording = () => {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingIdx(null);
  };

  const goTo = (idx: number) => {
    stopActiveRecording();
    setSpeechError('');
    setCurrentIdx(Math.max(0, Math.min(questions.length - 1, idx)));
  };

  const startWhisperRecording = async (idx: number) => {
    setSpeechError('');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setSpeechError('Microphone access denied.');
      return;
    }

    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      .find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const ext = recorder.mimeType.includes('ogg') ? 'ogg' : recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `recording.${ext}`, { type: blob.type });

      setTranscribingIdx(idx);
      try {
        const form = new FormData();
        form.append('audio', file);
        const res = await fetch('/api/transcribe', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Transcription failed');
        if (data.text) appendTranscript(idx, data.text);
      } catch (err) {
        setSpeechError(err instanceof Error ? err.message : 'Transcription failed');
      } finally {
        setTranscribingIdx(null);
      }
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecordingIdx(idx);
  };

  const startRecording = (idx: number) => {
    setSpeechError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (e: any) => appendTranscript(idx, e.results[0][0].transcript);
      recognition.onerror = () => setRecordingIdx(null);
      recognition.onend = () => setRecordingIdx(null);
      recognition.start();
      recognitionRef.current = recognition;
      setRecordingIdx(idx);
    } else if (typeof MediaRecorder !== 'undefined' && navigator.mediaDevices) {
      startWhisperRecording(idx);
    } else {
      setSpeechError('Voice input is not supported in this browser.');
    }
  };

  const toggleRecording = (idx: number) => {
    setSpeechError('');
    if (recordingIdx !== null) {
      stopActiveRecording();
      if (recordingIdx === idx) return;
    }
    startRecording(idx);
  };

  const submitAll = async () => {
    setLoading(true);
    setError('');
    stopActiveRecording();

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

  const answeredCount = answers.filter((a) => a.trim()).length;
  const avgScore = grades
    ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
    : null;
  const isLast = currentIdx === questions.length - 1;

  // ─── Results view (post-grading) ─────────────────────────────────────────
  if (grades) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Results</h2>
            <p className="text-sm text-gray-500 mt-0.5">Average score: <span className="font-semibold text-gray-700">{avgScore}%</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {questions.map((_, i) => {
              const grade = grades[i];
              return (
                <button
                  key={i}
                  onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-all hover:scale-110 ${STATUS_CELL[grade.status]} border font-bold`}
                  title={`Q${i + 1}: ${grade.score}% — ${grade.status}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Correct</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Partial</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block" /> Misconception</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Off Topic</span>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const grade = grades[i];
            const isExpanded = expandedQ === i;
            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden border-l-4 border-gray-200 ${
                  grade.score >= 85 ? 'border-l-emerald-500' : grade.score >= 50 ? 'border-l-amber-500' : 'border-l-red-500'
                }`}
              >
                <div className="p-5 pb-3">
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${STATUS_BG[grade.status]} text-white`}>
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-800 pt-0.5 flex-1">{q.text}</p>
                    <span className="shrink-0 text-sm font-bold text-gray-700">{grade.score}%</span>
                  </div>
                </div>
                <div className="px-5 pb-4">
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
                  <button
                    onClick={() => setExpandedQ(isExpanded ? null : i)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    {isExpanded ? 'Hide details' : 'Show details'}
                    <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur-sm pt-4 pb-2 mt-6">
          <button
            onClick={handleFinish}
            className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors"
          >
            View Full Summary
          </button>
        </div>
      </div>
    );
  }

  // ─── Study view (one question at a time) ─────────────────────────────────
  const q = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress + jump grid */}
      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm pb-4 pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question <span className="text-blue-600">{currentIdx + 1}</span> of {questions.length}
          </span>
          <span className="text-sm text-gray-500">{answeredCount} / {questions.length} answered</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3">
          <div
            className="h-1.5 bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Jump buttons */}
        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => {
            const hasAnswer = answers[i].trim().length > 0;
            const isCurrent = i === currentIdx;
            const cellClass = isCurrent
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300'
              : hasAnswer
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-white text-gray-400 border-gray-200';
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-9 h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-all hover:scale-110 border ${cellClass}`}
                title={`Question ${i + 1}${hasAnswer ? ' (answered)' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-2">
        <div className="p-5 pb-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center bg-blue-100 text-blue-600">
              {currentIdx + 1}
            </span>
            <p className="text-base font-medium text-gray-800 pt-0.5 leading-relaxed">{q.text}</p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="relative">
            <textarea
              key={q.id}
              ref={textareaRef}
              value={answers[currentIdx]}
              onChange={(e) => updateAnswer(currentIdx, e.target.value)}
              placeholder="Type your answer… or hold Space to dictate"
              rows={5}
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 p-3 pr-12 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-60"
              onKeyDown={(e) => {
                if (e.key === ' ' && recordingIdx !== currentIdx && transcribingIdx === null) {
                  e.preventDefault();
                  if (recordingIdx !== null) stopActiveRecording();
                  startRecording(currentIdx);
                }
              }}
              onKeyUp={(e) => {
                if (e.key === ' ' && recordingIdx === currentIdx) {
                  stopActiveRecording();
                }
              }}
            />
            <button
              onClick={() => toggleRecording(currentIdx)}
              disabled={loading || transcribingIdx === currentIdx}
              title={recordingIdx === currentIdx ? 'Stop recording' : 'Dictate answer'}
              className={`absolute right-2.5 top-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                recordingIdx === currentIdx
                  ? 'bg-red-500 text-white animate-pulse'
                  : transcribingIdx === currentIdx
                  ? 'bg-blue-100 text-blue-500 cursor-wait'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {transcribingIdx === currentIdx ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                </svg>
              )}
            </button>
          </div>
          {recordingIdx === currentIdx && (
            <p className="mt-1 text-xs text-red-500 font-medium">Listening… click mic to stop</p>
          )}
          {transcribingIdx === currentIdx && (
            <p className="mt-1 text-xs text-blue-500 font-medium">Transcribing…</p>
          )}
        </div>
      </div>

      {/* Navigation + submit */}
      <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur-sm pt-4 pb-2 mt-4">
        {speechError && (
          <p className="mb-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2">{speechError}</p>
        )}
        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3">
          {/* Previous */}
          <button
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Next or Submit */}
          {isLast ? (
            <button
              onClick={submitAll}
              disabled={answeredCount === 0 || loading}
              className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Grading…
                </>
              ) : (
                `Submit (${answeredCount}/${questions.length} answered)`
              )}
            </button>
          ) : (
            <button
              onClick={() => goTo(currentIdx + 1)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
