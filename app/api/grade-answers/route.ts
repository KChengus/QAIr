import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

interface QAPair {
  question: string;
  userAnswer: string;
}

export async function POST(request: NextRequest) {
  const { pairs, sourceContext } = (await request.json()) as {
    pairs: QAPair[];
    sourceContext: string;
  };

  if (!pairs?.length) {
    return NextResponse.json({ error: 'No question-answer pairs provided' }, { status: 400 });
  }

  const system = sourceContext?.trim()
    ? 'You are an expert tutor grading a batch of student answers. Grade ONLY based on the provided source material. Do not use external knowledge.'
    : 'You are an expert tutor grading a batch of student answers based on your knowledge of the subject.';

  const qaPairs = pairs
    .map(
      (p, i) =>
        `--- Question ${i + 1} ---\nQ: ${p.question}\nA: ${p.userAnswer.trim() || '(no answer provided)'}`
    )
    .join('\n\n');

  const userContent = [
    sourceContext?.trim() ? `SOURCE MATERIAL:\n${sourceContext}\n` : '',
    `STUDENT ANSWERS TO GRADE:\n\n${qaPairs}`,
    `
Grade each answer above. For unanswered questions (empty or "(no answer provided)"), give score 0 and status "Off Topic".

Return ONLY a raw JSON array with one object per question, in order. No markdown fences, no explanation.
Each object must have:
- "score": number 0-100
- "status": "Fully Correct" | "Partially Correct" | "Misconception" | "Off Topic"
- "missingConcepts": string[] (key concepts the student missed)
- "correctAnswer": string (concise correct answer from source material)
- "eli5Explanation": string (simple explanation of the concept)
- "feedback": string (specific 1-2 sentence constructive feedback)

Example format:
[{"score":85,"status":"Fully Correct","missingConcepts":[],"correctAnswer":"...","eli5Explanation":"...","feedback":"..."},{"score":40,"status":"Partially Correct","missingConcepts":["concept A"],"correctAnswer":"...","eli5Explanation":"...","feedback":"..."}]`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: userContent }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected AI response' }, { status: 500 });
    }

    const cleaned = content.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response:', content.text);
      return NextResponse.json(
        { error: 'AI returned an unexpected format. Please try again.' },
        { status: 500 }
      );
    }

    const results = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(results) || results.length !== pairs.length) {
      return NextResponse.json(
        { error: `Expected ${pairs.length} grades but got ${Array.isArray(results) ? results.length : 0}. Please try again.` },
        { status: 500 }
      );
    }

    return NextResponse.json({ results });
  } catch (error) {
    const msg =
      error instanceof Anthropic.APIError
        ? `API error: ${error.message}`
        : error instanceof SyntaxError
        ? 'AI returned invalid JSON. Please try again.'
        : error instanceof Error
        ? error.message
        : 'Unknown error';
    console.error('Batch grade error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
