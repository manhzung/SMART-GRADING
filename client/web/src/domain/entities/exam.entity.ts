export interface Question {
  _id: string;
  content: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank';
  options?: string[];
  correctAnswer?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  explanation?: string;
  imageUrl?: string;
}

export interface Exam {
  _id: string;
  classId: string;
  title: string;
  description?: string;
  subjectId?: string;
  date: string;
  duration: number;
  totalScore: number;
  status: 'draft' | 'published' | 'completed';
  questionIds: string[];
}

export interface Submission {
  _id: string;
  examId: string;
  versionId?: string;
  studentId: string;
  studentCode?: string;
  answers?: Record<string, string>;
  score?: number;
  imageUrl?: string;
  omrData?: Record<string, unknown>;
  status: 'pending' | 'scanning' | 'scored' | 'appealed';
  scannedAt?: string;
}
