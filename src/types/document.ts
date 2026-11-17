export type Language = 'en' | 'hi';

export type RiskSeverity = 'low' | 'medium' | 'high';

export type ResultTab = 'deadlines' | 'money' | 'risks' | 'steps';

export type ThemeMode = 'dark' | 'light';

export interface DeadlineItem {
  when: string;
  what: string;
  note: string;
}

export interface MoneyItem {
  label: string;
  amount: string;
  note: string;
}

export interface RiskItem {
  sev: RiskSeverity;
  clause: string;
  text: string;
}

export interface DocumentAnalysis {
  readable?: boolean;
  unreadableReason?: string;
  type: string;
  summary: string;
  deadlines: DeadlineItem[];
  money: MoneyItem[];
  risks: RiskItem[];
  steps: string[];
}

export interface UploadedPage {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
  previewUrl: string;
}

export interface QaMessage {
  id: string;
  question: string;
  answer: string;
  citedClause?: string;
  notInDocument?: boolean;
}

export interface AskResponse {
  answer: string;
  citedClause?: string;
  notInDocument: boolean;
}

export interface SavedAnalysisRecord {
  id: string;
  userId: string;
  language: Language;
  type: string;
  summary: string;
  deadlines: DeadlineItem[];
  money: MoneyItem[];
  risks: RiskItem[];
  steps: string[];
  completedSteps: number[];
  updatedAtMs: number;
}

