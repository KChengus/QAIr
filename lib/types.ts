export interface ParsedQuestion {
  id: string;
  text: string;
  enabled: boolean;
}

export interface GradingResult {
  score: number;
  status: 'Fully Correct' | 'Partially Correct' | 'Misconception' | 'Off Topic';
  missingConcepts: string[];
  correctAnswer: string;
  eli5Explanation: string;
  feedback: string;
}

export interface StudyResult {
  question: string;
  userAnswer: string;
  grading: GradingResult;
}

export type AppView = 'setup' | 'review' | 'study' | 'complete';
