export interface ExamReport {
  _id: string;
  examId: string;
  examTitle: string;
  totalStudents: number;
  totalSubmissions: number;
  submissionRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  gradeDistribution: {
    grade: string;
    count: number;
    percentage: number;
  }[];
  scoreHistogram: {
    range: string;
    count: number;
  }[];
  generatedAt: string;
}
