import { useState, useCallback } from 'react';
import type { Exam } from '../../presentation/store/examStore';
import type { BackendSubmission } from '../../presentation/store/submissionStore';
import type { ExamReport } from './types';
import {
  generateExamReportPDF,
  generateExamReportExcel,
  prepareStudentScores,
} from './examReportExport';

export type ExportType = 'pdf' | 'excel';
export type ReportType = 'exam' | 'class' | 'student';

export interface ExportOptions {
  exportType: ExportType;
  reportType: ReportType;
  includeGradeDistribution: boolean;
  includeStatistics: boolean;
  includeAnswerKey: boolean;
}

export interface UseReportExportReturn {
  isExporting: boolean;
  exportProgress: number;
  exportError: string | null;
  exportExamReportPDF: (
    examId: string,
    options?: Partial<Pick<ExportOptions, 'includeGradeDistribution' | 'includeStatistics' | 'includeAnswerKey'>>
  ) => Promise<void>;
  exportExamReportExcel: (
    examId: string,
    options?: Partial<Pick<ExportOptions, 'includeGradeDistribution' | 'includeStatistics' | 'includeAnswerKey'>>
  ) => Promise<void>;
  exportWithOptions: (exam: Exam, report: ExamReport, submissions: BackendSubmission[], options: ExportOptions) => Promise<void>;
  resetExport: () => void;
}

export function useReportExport(): UseReportExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const resetExport = useCallback(() => {
    setIsExporting(false);
    setExportProgress(0);
    setExportError(null);
  }, []);

  const exportWithOptions = useCallback(async (
    exam: Exam,
    report: ExamReport,
    submissions: BackendSubmission[],
    options: ExportOptions
  ) => {
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      // Prepare student scores
      setExportProgress(10);
      const studentScores = prepareStudentScores(submissions, exam.passingScore || 5);

      setExportProgress(30);

      // Generate export based on type
      if (options.exportType === 'pdf') {
        setExportProgress(40);
        generateExamReportPDF(report, exam, studentScores, {
          includeGradeDistribution: options.includeGradeDistribution,
          includeStatistics: options.includeStatistics,
          includeAnswerKey: options.includeAnswerKey,
        });
      } else {
        setExportProgress(40);
        generateExamReportExcel(report, exam, studentScores, {
          includeGradeDistribution: options.includeGradeDistribution,
          includeStatistics: options.includeStatistics,
          includeAnswerKey: options.includeAnswerKey,
        });
      }

      setExportProgress(100);
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xuất báo cáo');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportExamReportPDF = useCallback(async (
    examId: string,
    options?: Partial<Pick<ExportOptions, 'includeGradeDistribution' | 'includeStatistics' | 'includeAnswerKey'>>
  ) => {
    // This is a placeholder - in real implementation, you would fetch data from the store
    // For now, this demonstrates the API pattern
    console.log('Export PDF for exam:', examId, options);
    
    // The actual implementation would be:
    // 1. Fetch exam data from examStore
    // 2. Fetch submissions from submissionStore
    // 3. Generate report using the data
    // For demo purposes, this function signals the intent
    setExportError('Vui lòng sử dụng exportWithOptions với dữ liệu thực tế');
  }, []);

  const exportExamReportExcel = useCallback(async (
    examId: string,
    options?: Partial<Pick<ExportOptions, 'includeGradeDistribution' | 'includeStatistics' | 'includeAnswerKey'>>
  ) => {
    // Similar to PDF export - placeholder for actual implementation
    console.log('Export Excel for exam:', examId, options);
    setExportError('Vui lòng sử dụng exportWithOptions với dữ liệu thực tế');
  }, []);

  return {
    isExporting,
    exportProgress,
    exportError,
    exportExamReportPDF,
    exportExamReportExcel,
    exportWithOptions,
    resetExport,
  };
}
