# QuestionAIre

AI-powered flashcard study tool. Paste your notes or upload a PDF, pick a difficulty level, and let AI generate study questions. Answer all questions on a single page, then get batch-graded with color-coded results and detailed feedback.

## Features

- **AI Question Generation** — Generates 5-10 questions from your source material at easy, medium, or hard difficulty
- **Single-Page Answering** — All questions on one page with text input fields
- **Batch Grading** — One API call grades all answers with scores, feedback, missing concepts, and ELI5 explanations
- **Color-Coded Results** — Question grid highlights each answer by accuracy (green/amber/orange/red)
- **PDF & TXT Upload** — Extract text from uploaded documents
- **Voice Input** — Dictate answers via microphone (Chrome/Edge)

## Quick Start

```bash
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Get from [console.anthropic.com](https://console.anthropic.com) |

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v3**
- **Anthropic Claude** (`claude-haiku-4-5-20251001`) via `@anthropic-ai/sdk`
- **pdf-parse** v1.1.1 for PDF text extraction

## How It Works

1. **Setup** — Paste notes or upload PDF/TXT, select question difficulty
2. **Review** — Toggle which AI-generated questions to study
3. **Study** — Answer all questions on one page, submit for batch grading
4. **Results** — Color-coded question grid + per-question feedback with scores

## License

MIT
