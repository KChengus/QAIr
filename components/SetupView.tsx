'use client';

import { useState, useRef, useCallback } from 'react';
import { ParsedQuestion, Difficulty } from '@/lib/types';

interface Props {
  onParsed: (questions: ParsedQuestion[], sourceContext: string, difficulty: Difficulty) => void;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; activeColor: string; desc: string }> = {
  easy: {
    label: 'Easy',
    color: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200',
    desc: 'Recall & definitions',
  },
  medium: {
    label: 'Medium',
    color: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    activeColor: 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200',
    desc: 'Understanding & application',
  },
  hard: {
    label: 'Hard',
    color: 'border-red-200 text-red-700 hover:bg-red-50',
    activeColor: 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200',
    desc: 'Analysis & critical thinking',
  },
};

export default function SetupView({ onParsed }: Props) {
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFile = async (file: File) => {
    setError('');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      setError('Unsupported file type. Please upload a .txt or .pdf file.');
      return;
    }

    setUploading(true);

    try {
      let content: string;

      if (isTxt) {
        content = await file.text();
      } else {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/extract-text', { method: 'POST', body: form });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Server error while processing PDF. Please try again.');
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to extract text');
        content = data.text;
      }

      if (!content.trim()) {
        throw new Error('Could not extract any text from this file.');
      }

      setText(content);
      setUploadedFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setText('');
    setUploadedFileName('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/parse-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, difficulty }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions');

      if (!data.questions?.length) {
        setError('No questions could be generated. Try adding more content.');
        return;
      }

      const questions: ParsedQuestion[] = data.questions.map(
        (q: string, i: number) => ({ id: `q-${i}`, text: q, enabled: true })
      );

      onParsed(questions, data.sourceContext ?? text, difficulty);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const hasFile = !!uploadedFileName;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          AI-Powered Flashcards
        </h1>
        <p className="text-gray-500 text-lg">
          Paste your notes or upload a file. AI will generate study questions
          and grade your answers with detailed feedback.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Source Material
          </label>
          {!hasFile && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.pdf,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload PDF / TXT
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {hasFile ? (
          /* File uploaded — show file info and extracted text preview (read-only) */
          <div>
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl mb-3">
              <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-blue-800 flex-1 truncate">
                {uploadedFileName}
              </span>
              <button
                onClick={handleRemoveFile}
                className="text-blue-500 hover:text-red-500 transition-colors shrink-0"
                title="Remove file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 font-mono max-h-[340px] overflow-y-auto whitespace-pre-wrap">
              {text}
            </div>
          </div>
        ) : (
          /* No file — show drag-and-drop zone / textarea */
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your lecture notes, textbook excerpts, or any study material here..."
              rows={14}
              className="w-full rounded-xl border border-gray-300 p-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
            />

            {/* Drag overlay */}
            {dragging && (
              <div className="absolute inset-0 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/80 flex flex-col items-center justify-center pointer-events-none z-10">
                <svg className="w-10 h-10 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm font-medium text-blue-700">Drop your PDF or TXT file here</p>
              </div>
            )}

            {/* Uploading overlay */}
            {uploading && (
              <div className="absolute inset-0 rounded-xl bg-white/80 flex flex-col items-center justify-center z-10">
                <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm font-medium text-gray-600">Extracting text...</p>
              </div>
            )}
          </div>
        )}

        {/* Difficulty selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Difficulty
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG[Difficulty]][]).map(
              ([key, config]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                    difficulty === key ? config.activeColor : config.color
                  }`}
                >
                  <div>{config.label}</div>
                  <div className="text-xs opacity-70 font-normal mt-0.5">{config.desc}</div>
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {hasFile
              ? 'Text extracted from your file. Select difficulty and generate questions.'
              : 'Paste text or drag & drop a PDF/TXT file. AI will generate questions at the selected difficulty.'}
          </p>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating...
              </>
            ) : (
              'Generate Questions'
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        {[
          { icon: '🧠', title: 'AI Grading', desc: 'Nuanced feedback on conceptual understanding' },
          { icon: '🎤', title: 'Voice Input', desc: 'Answer hands-free with your microphone' },
          { icon: '📚', title: 'Source-Grounded', desc: 'AI cites your notes to prevent hallucinations' },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-gray-800 text-sm">{f.title}</div>
            <div className="text-gray-500 text-xs mt-1">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
