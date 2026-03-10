import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CognitiveCard AI',
  description: 'AI-powered flashcards with nuanced feedback',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
