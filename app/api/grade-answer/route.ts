import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const { question, userAnswer, sourceContext } = await request.json();

  if (!question || !userAnswer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const system = sourceContext?.trim()
    ? `You are an expert tutor. Grade student answers based ONLY on the provided source material. Do not use external knowledge. Cite and reference only what is in the source material.`
    : `You are an expert tutor. Grade student answers based on your knowledge of the subject.`;

  const userContent = [
    sourceContext?.trim() ? `SOURCE MATERIAL:\n${sourceContext}\n` : '',
    `QUESTION: ${question}`,
    `STUDENT ANSWER: ${userAnswer}`,
    `
Grade this answer. Return ONLY valid JSON with no extra text:
{
  "score": <number 0-100>,
  "status": <"Fully Correct"|"Partially Correct"|"Misconception"|"Off Topic">,
  "missingConcepts": [<string>, ...],
  "correctAnswer": <string — concise correct answer based on source material>,
  "eli5Explanation": <string — simple ELI5 explanation of the concept>,
  "feedback": <string — specific, constructive 1-2 sentence feedback to the student>
}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userContent }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected AI response' }, { status: 500 });
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse grading result' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Grade error:', error);
    return NextResponse.json({ error: 'Failed to grade answer' }, { status: 500 });
  }
}
