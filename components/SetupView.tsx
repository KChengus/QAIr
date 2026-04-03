'use client';

import { useState, useRef, useCallback } from 'react';
import { ParsedQuestion, Difficulty } from '@/lib/types';

interface Props {
  onParsed: (questions: ParsedQuestion[], sourceContext: string, difficulty: Difficulty, sourceGrounded: boolean) => void;
}

interface UploadedFile {
  name: string;
  text: string;
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
  const [manualText, setManualText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [sourceGrounded, setSourceGrounded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadingNames, setUploadingNames] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const hasFiles = uploadedFiles.length > 0;
  const combinedText = hasFiles
    ? uploadedFiles.map((f) => f.text).join('\n\n')
    : manualText;

  const processFile = async (file: File): Promise<UploadedFile> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      throw new Error(`"${file.name}" is not a supported file type (.pdf or .txt).`);
    }

    let content: string;
    if (isTxt) {
      content = await file.text();
    } else {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/extract-text', { method: 'POST', body: form });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server error while processing "${file.name}". Please try again.`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to extract text from "${file.name}"`);
      content = data.text;
    }

    if (!content.trim()) {
      throw new Error(`Could not extract any text from "${file.name}".`);
    }

    return { name: file.name, text: content };
  };

  const handleFiles = async (files: File[]) => {
    setError('');
    const names = files.map((f) => f.name);
    setUploadingNames(names);

    const results: UploadedFile[] = [];
    const errors: string[] = [];

    await Promise.all(
      files.map(async (file) => {
        try {
          const result = await processFile(file);
          results.push(result);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : `Failed to process "${file.name}"`);
        }
      })
    );

    setUploadingNames([]);

    if (results.length > 0) {
      setUploadedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = results.filter((r) => !existingNames.has(r.name));
        return [...prev, ...newFiles];
      });
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
    }
  };

  const handleRemoveFile = (name: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== name));
    setError('');
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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFiles(files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!combinedText.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/parse-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedText, difficulty, questionCount, sourceGrounded }),
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

      onParsed(questions, data.sourceContext ?? combinedText, difficulty, sourceGrounded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          AI-Powered Flashcards
        </h1>
        <p className="text-gray-500 text-lg">
          Paste your notes or upload files. AI will generate study questions
          and grade your answers with detailed feedback.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Source Material
          </label>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf,application/pdf,text/plain"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) handleFiles(files);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingNames.length > 0}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploadingNames.length > 0 ? (
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
        </div>

        {/* Uploaded files list */}
        {hasFiles && (
          <div className="mb-3 flex flex-col gap-2">
            {uploadedFiles.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl"
              >
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-blue-800 flex-1 truncate">{f.name}</span>
                <button
                  onClick={() => handleRemoveFile(f.name)}
                  className="text-blue-400 hover:text-red-500 transition-colors shrink-0"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Files being uploaded */}
            {uploadingNames.map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl opacity-60"
              >
                <svg className="animate-spin w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm text-gray-600 flex-1 truncate">{name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Text area / drag-drop zone (only shown when no files uploaded) */}
        {!hasFiles && (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative"
          >
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
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
                <p className="text-sm font-medium text-blue-700">Drop your PDF or TXT files here</p>
              </div>
            )}

            {/* Uploading overlay */}
            {uploadingNames.length > 0 && (
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

        {/* Source grounding toggle */}
        <div className="mt-4 flex items-center justify-between py-3 px-4 rounded-xl border border-gray-200 bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-700">Restrict to source material</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {sourceGrounded
                ? 'Questions will only cover what is in your notes.'
                : 'Questions may go beyond your notes using general knowledge.'}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={sourceGrounded}
            onClick={() => setSourceGrounded((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              sourceGrounded ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ${
                sourceGrounded ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Question count selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions
            <span className="ml-2 text-blue-600 font-semibold">{questionCount}</span>
          </label>
          <div className="flex gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  questionCount === n
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {hasFiles
              ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} ready. Select difficulty and generate questions.`
              : 'Paste text or drag & drop PDF/TXT files. AI will generate questions at the selected difficulty.'}
          </p>
          <button
            onClick={handleSubmit}
            disabled={!combinedText.trim() || loading}
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
