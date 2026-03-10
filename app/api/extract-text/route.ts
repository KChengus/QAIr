import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

function isPdf(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

// Custom page renderer that uses positional data to insert proper spacing.
// The default pdf-parse renderer concatenates text items without gaps,
// which merges words into one long string for many PDFs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPage(pageData: any) {
  return pageData.getTextContent().then(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (textContent: { items: any[] }) => {
      let lastY: number | null = null;
      let lastX: number | null = null;
      let lastWidth: number | null = null;
      let text = '';

      for (const item of textContent.items) {
        if (!item.str) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const fontSize = Math.abs(item.transform[0]) || 12;
        const spaceWidth = fontSize * 0.3;

        if (lastY !== null && Math.abs(lastY - y) > fontSize * 0.3) {
          // New line — Y position changed significantly
          text += '\n';
        } else if (lastX !== null && lastWidth !== null) {
          // Same line — check horizontal gap between end of last item and start of this one
          const gap = x - (lastX + lastWidth);
          if (gap > spaceWidth) {
            text += ' ';
          }
        }

        text += item.str;
        lastX = x;
        lastY = y;
        lastWidth = item.width;
      }
      return text;
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;

    if (isPdf(file)) {
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
