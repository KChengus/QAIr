import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey, AI_RATE_LIMIT } from '@/lib/rate-limit';

const client = new Anthropic();

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_INSTRUCTIONS: Record<Difficulty, string> = {
  easy: 'Generate simple recall and definition questions. Focus on basic facts, key terms, and straightforward concepts that test surface-level understanding.',
  medium: 'Generate questions that require understanding and application. Include "explain why", "compare and contrast", and "how does X relate to Y" style questions.',
  hard: 'Generate challenging questions that require deep analysis, synthesis, and critical thinking. Include multi-step reasoning, edge cases, "what would happen if", and questions that connect multiple concepts.',
};

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per minute per IP
  const rlKey = getRateLimitKey(request, 'parse-questions');
  const rl = checkRateLimit(rlKey, AI_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${Math.ceil(rl.retryAfterMs / 1000)} seconds.` },
      { status: 429 }
    );
  }

  const { text, difficulty = 'medium', previousQuestions = [], questionCount = 5, sourceGrounded = true } = await request.json();
  const count = Math.min(10, Math.max(1, Number(questionCount) || 5));

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  const diff: Difficulty = validDifficulties.includes(difficulty) ? difficulty : 'medium';

  const prevBlock =
    Array.isArray(previousQuestions) && previousQuestions.length > 0
      ? `\n\nIMPORTANT: The following questions have ALREADY been generated. You MUST generate completely NEW and DIFFERENT questions. Do NOT repeat or rephrase any of these:\n${previousQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a study question generator. Given the source material below, generate study questions at the specified difficulty level.

Difficulty: ${diff.toUpperCase()}
${DIFFICULTY_INSTRUCTIONS[diff]}

Generate exactly ${count} question${count === 1 ? '' : 's'} based on the material. ${
  sourceGrounded
    ? 'The questions should be answerable using ONLY the provided source material.'
    : 'Use the source material as context and inspiration, but you may draw on broader general knowledge to generate additional relevant questions beyond what is explicitly stated.'
}${prevBlock}

You MUST return ONLY a raw JSON object — no markdown fences, no explanation, no extra text.
Format: {"questions":["Question 1?","Question 2?"]}

Source material:
${text}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected AI response type' }, { status: 500 });
    }

    // Strip markdown fences if present, then extract JSON
    const cleaned = content.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content.text);
      return NextResponse.json(
        { error: 'AI returned an unexpected format. Please try again.' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: 'AI did not return a questions array. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questions: parsed.questions,
      sourceContext: text,
    });
  } catch (error) {
    const message =
      error instanceof Anthropic.APIError
        ? `API error: ${error.message}`
        : error instanceof SyntaxError
        ? 'AI returned invalid JSON. Please try again.'
        : error instanceof Error
        ? error.message
        : 'Unknown error';
    console.error('Parse error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
