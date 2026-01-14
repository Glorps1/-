export enum Category {
  OSCILLATIONS = "Колебания и цепи",
  WAVES_OPTICS = "Волны и оптика",
  QUANTUM = "Квантовая физика",
  THERMODYNAMICS = "Термодинамика",
  NUCLEAR = "Ядерная физика"
}

export interface Question {
  id: number;
  text: string;
  category: Category;
  hasProblem?: boolean;
}

export interface ExplanationState {
  loading: boolean;
  content: string | null;
  error: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface VideoRecommendation {
  query: string;
  description: string;
  type: 'lecture' | 'problem_solving' | 'experiment';
}