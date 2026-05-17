import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey, DEFAULT_RATE_LIMIT } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(req, 'transcribe'), DEFAULT_RATE_LIMIT);
  if (!rl.allowed) {
    const retryS = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryS}s.` },
      { status: 429 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Transcription not configured.' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const audio = formData.get('audio') as File | null;
  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: 'No audio received.' }, { status: 400 });
  }

  const whisperForm = new FormData();
  whisperForm.append('file', audio, audio.name || 'recording.webm');
  whisperForm.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: whisperForm,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Whisper API error:', err);
    return NextResponse.json({ error: 'Transcription failed.' }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json({ text: data.text ?? '' });
}
