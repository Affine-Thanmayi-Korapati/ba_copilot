import { Request } from 'express';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface AnalysisSession {
  id: string;
  userId: string;
  title: string;
  meetingNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIAnalysis {
  id: string;
  sessionId: string;
  executiveSummary: string;
  functionalRequirements: string[];
  userStories: Array<{
    title: string;
    story: string;
    acceptanceCriteria: string[];
  }>;
  risks: string[];
  assumptions: string[];
  clarifyingQuestions: string[];
  createdAt: string;
}

export interface ExportRecord {
  id: string;
  sessionId: string;
  exportType: 'pdf' | 'markdown';
  exportedAt: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}
