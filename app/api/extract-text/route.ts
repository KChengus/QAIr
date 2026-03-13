import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey, DEFAULT_RATE_LIMIT } from '@/lib/rate-limit';

function isPdf(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Custom page renderer that uses the transform matrix to detect gaps
 * between text items and insert spaces/newlines accordingly.
 *
 * Each text item has a `transform` array: [scaleX, skewY, skewX, scaleY, translateX, translateY].
 * We use translateX/Y to detect line breaks (Y changed) and word gaps (X gap > threshold).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPage(pageData: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pageData.getTextContent().then((textContent: { items: any[] }) => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let lastY: number | null = null;
    let lastEndX: number | null = null;

    for (const item of textContent.items) {
      // Skip empty items and non-text markers
      if (!item.str && item.str !== ' ') continue;

      const x = item.transform[4];
      const y = item.transform[5];
      const fontSize = Math.abs(item.transform[0]) || 12;

      // Detect new line: Y position changed by more than half the font size
      if (lastY !== null && Math.abs(y - lastY) > fontSize * 0.5) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = [];
        lastEndX = null;
      }

      // Detect word gap on the same line
      if (lastEndX !== null) {
        const gap = x - lastEndX;
        // If the gap is larger than ~30% of the font size, insert a space
        if (gap > fontSize * 0.25) {
          currentLine.push(' ');
        }
      }

      if (item.str) {
        currentLine.push(item.str);
      }

      // Estimate the end X position of this text item.
      // item.width is in text space units; scale by the font's horizontal scale factor.
      const scaleX = Math.abs(item.transform[0]) || 1;
      lastEndX = x + (item.width != null ? item.width * scaleX / fontSize : 0);
      lastY = y;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines.map((line) => line.join('')).join('\n');
  });
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const rlKey = getRateLimitKey(request, 'extract-text');
  const rl = checkRateLimit(rlKey, DEFAULT_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${Math.ceil(rl.retryAfterMs / 1000)} seconds.` },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;

    if (isPdf(file)) {
      // Lazy-load pdf-parse inside the handler to avoid top-level require
      // crashing on Vercel serverless (test file path resolution issue)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer, { pagerender: renderPage });
      text = result.text;
    } else {
      text = buffer.toString('utf-8');
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract any text from this file.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Extract text error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}
