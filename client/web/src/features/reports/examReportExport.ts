import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ExamReport } from './types';
import type { Exam } from '../../presentation/store/examStore';
import type { BackendSubmission } from '../../presentation/store/submissionStore';
import { apiService } from '../../core/api';
import env from '../../config/env';

// ─── Type Definitions ──────────────────────────────────────────────────────────

export interface StudentScore {
  name: string;
  score: number;
  grade: string;
  status: 'pass' | 'fail' | 'pending';
}

export interface GradeDistributionRow {
  grade: string;
  count: number;
  percentage: number;
}

export interface ExamReportData {
  report: ExamReport;
  exam: Exam;
  submissions: BackendSubmission[];
  studentScores: StudentScore[];
  gradeDistribution: GradeDistributionRow[];
}

// ─── Grade Calculation Helpers ─────────────────────────────────────────────────

export function calculateGrade(score: number, totalScore: number = 10): string {
  const percentage = (score / totalScore) * 100;
  if (percentage >= 85) return 'Giỏi';
  if (percentage >= 70) return 'Khá';
  if (percentage >= 50) return 'Trung bình';
  if (percentage >= 35) return 'Yếu';
  return 'Kém';
}

export function isPassing(score: number, passingScore: number = 5): boolean {
  return score >= passingScore;
}

// ─── PDF Export Functions ─────────────────────────────────────────────────────

export function generateExamReportPDF(
  report: ExamReport,
  exam: Exam,
  studentScores: StudentScore[],
  options: {
    includeGradeDistribution?: boolean;
    includeStatistics?: boolean;
    includeAnswerKey?: boolean;
  } = {}
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // #2563EB
  const grayColor: [number, number, number] = [107, 114, 128]; // #6B7280
  const lightGray: [number, number, number] = [243, 244, 246]; // #F3F4F6

  // ─── Header ────────────────────────────────────────────────────────────────
  
  // School name (placeholder)
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text('Trường THPT Chuyên Nguyễn Bỉnh Khiêm', pageWidth / 2, 15, { align: 'center' });

  // Title
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('BÁO CÁO KẾT QUẢ BÀI THI', pageWidth / 2, 25, { align: 'center' });

  // Exam title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(exam.title || 'Báo cáo kỳ thi', pageWidth / 2, 33, { align: 'center' });

  // Date
  const examDate = exam.examDate ? new Date(exam.examDate).toLocaleDateString('vi-VN') : 'N/A';
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text(`Ngày thi: ${examDate}`, pageWidth / 2, 40, { align: 'center' });

  // Divider line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 45, pageWidth - 20, 45);

  // ─── Statistics Section ────────────────────────────────────────────────────
  
  let currentY = 55;

  if (options.includeStatistics !== false) {
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('1. THỐNG KÊ TỔNG QUAN', 20, currentY);
    currentY += 8;

    // Stats boxes
    const statsData = [
      { label: 'Tổng học sinh', value: report.totalStudents.toString() },
      { label: 'Tổng bài nộp', value: report.totalSubmissions.toString() },
      { label: 'Tỷ lệ nộp bài', value: `${report.submissionRate}%` },
      { label: 'Điểm trung bình', value: report.averageScore.toFixed(1) },
      { label: 'Điểm cao nhất', value: report.highestScore.toFixed(1) },
      { label: 'Điểm thấp nhất', value: report.lowestScore.toFixed(1) },
      { label: 'Tỷ lệ đạt', value: `${report.passRate}%` },
      { label: 'Điểm tối đa', value: exam.totalScore?.toString() || '10' },
    ];

    const boxWidth = 42;
    const boxHeight = 18;
    const startX = 20;
    const gap = 6;

    statsData.forEach((stat, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = startX + col * (boxWidth + gap);
      const y = currentY + row * (boxHeight + 4);

      // Box background
      doc.setFillColor(...lightGray);
      doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');

      // Label
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.text(stat.label, x + boxWidth / 2, y + 7, { align: 'center' });

      // Value
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(stat.value, x + boxWidth / 2, y + 14, { align: 'center' });
    });

    currentY += boxHeight * 2 + 12;
  }

  // ─── Grade Distribution Section ───────────────────────────────────────────
  
  if (options.includeGradeDistribution !== false) {
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('2. PHÂN BỔ ĐIỂM', 20, currentY);
    currentY += 8;

    autoTable(doc, {
      startY: currentY,
      head: [['Xếp loại', 'Số lượng', 'Tỷ lệ']],
      body: report.gradeDistribution.map((gradeRow) => [
        gradeRow.grade,
        gradeRow.count.toString(),
        `${gradeRow.percentage}%`,
      ]),
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: 20, right: 20 },
    });

    // Get the Y position after table
    const autoTableResult = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable;
    const afterTable = autoTableResult.finalY + 15;
    currentY = afterTable;
  }

  // ─── Student Scores Section ────────────────────────────────────────────────
  
  // Check if we need a new page
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('3. BẢNG ĐIỂM HỌC SINH', 20, currentY);
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    head: [['STT', 'Họ tên', 'Điểm', 'Xếp loại', 'Trạng thái']],
    body: studentScores.map((s, idx) => [
      (idx + 1).toString(),
      s.name,
      s.score.toFixed(1),
      s.grade,
      s.status === 'pass' ? 'Đạt' : s.status === 'fail' ? 'Không đạt' : 'Chưa chấm',
    ]),
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      // Highlight passing/failing status
      if (data.column.index === 4 && data.section === 'body') {
        if (data.cell.raw === 'Đạt') {
          data.cell.styles.textColor = [16, 185, 129]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'Không đạt') {
          data.cell.styles.textColor = [239, 68, 68]; // Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ─── Footer ────────────────────────────────────────────────────────────────
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(
      `Trang ${i} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Báo cáo được tạo tự động - Smart Grading`,
      20,
      pageHeight - 10
    );
    doc.text(
      new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      pageWidth - 20,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  // ─── Save PDF ──────────────────────────────────────────────────────────────
  
  const filename = `BaoCao_${exam.title?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'Exam'}_${Date.now()}.pdf`;
  doc.save(filename);
}

// ─── Excel Export Functions ────────────────────────────────────────────────────

export function generateExamReportExcel(
  report: ExamReport,
  exam: Exam,
  studentScores: StudentScore[],
  options: {
    includeGradeDistribution?: boolean;
    includeStatistics?: boolean;
    includeAnswerKey?: boolean;
  } = {}
): void {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Summary ─────────────────────────────────────────────────────
  
  if (options.includeStatistics !== false) {
    const summaryData: (string | number)[][] = [
      ['BÁO CÁO KẾT QUẢ BÀI THI'],
      [exam.title || 'Báo cáo kỳ thi'],
      [],
      ['THÔNG TIN KỲ THI'],
      ['Ngày thi', exam.examDate ? new Date(exam.examDate).toLocaleDateString('vi-VN') : 'N/A'],
      ['Môn học', exam.subjectName || 'N/A'],
      ['Số câu hỏi', exam.numberOfQuestions || 'N/A'],
      ['Thời gian thi (phút)', exam.duration || 'N/A'],
      ['Điểm tối đa', exam.totalScore || 10],
      ['Điểm đạt', exam.passingScore || 5],
      [],
      ['THỐNG KÊ TỔNG QUAN'],
      ['Tổng học sinh', report.totalStudents],
      ['Tổng bài nộp', report.totalSubmissions],
      ['Tỷ lệ nộp bài (%)', report.submissionRate],
      ['Điểm trung bình', report.averageScore],
      ['Điểm cao nhất', report.highestScore],
      ['Điểm thấp nhất', report.lowestScore],
      ['Tỷ lệ đạt (%)', report.passRate],
      [],
      ['Ngày tạo báo cáo', new Date().toLocaleString('vi-VN')],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths
    summaryWs['!cols'] = [
      { wch: 30 }, // Column A
      { wch: 20 }, // Column B
    ];

    // Merge title cells
    summaryWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Title row
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // Exam title
    ];

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng quan');
  }

  // ─── Sheet 2: Student Scores ───────────────────────────────────────────────
  
  const studentData: (string | number)[][] = [
    ['STT', 'Họ tên', 'Điểm', 'Xếp loại', 'Trạng thái'],
  ];

  studentScores.forEach((student, index) => {
    studentData.push([
      index + 1,
      student.name,
      student.score,
      student.grade,
      student.status === 'pass' ? 'Đạt' : student.status === 'fail' ? 'Không đạt' : 'Chưa chấm',
    ]);
  });

  // Add summary row
  studentData.push([]);
  studentData.push(['Tổng cộng', '', '', '', '']);
  studentData.push(['Số học sinh', report.totalStudents]);
  studentData.push(['Điểm trung bình', report.averageScore]);
  studentData.push(['Điểm cao nhất', report.highestScore]);
  studentData.push(['Điểm thấp nhất', report.lowestScore]);
  studentData.push(['Tỷ lệ đạt', `${report.passRate}%`]);

  const studentWs = XLSX.utils.aoa_to_sheet(studentData);

  // Set column widths
  studentWs['!cols'] = [
    { wch: 8 },   // STT
    { wch: 30 },  // Họ tên
    { wch: 10 },  // Điểm
    { wch: 15 },  // Xếp loại
    { wch: 15 },  // Trạng thái
  ];

  XLSX.utils.book_append_sheet(wb, studentWs, 'Bảng điểm');

  // ─── Sheet 3: Grade Distribution ──────────────────────────────────────────
  
  if (options.includeGradeDistribution !== false) {
    const gradeData: (string | number)[][] = [
      ['PHÂN BỔ ĐIỂM'],
      [],
      ['Xếp loại', 'Số lượng', 'Tỷ lệ (%)'],
    ];

    report.gradeDistribution.forEach((gradeRow) => {
      gradeData.push([gradeRow.grade, gradeRow.count, gradeRow.percentage]);
    });

    // Add total row
    const totalStudents = report.gradeDistribution.reduce((sum, gradeRow) => sum + gradeRow.count, 0);
    gradeData.push([]);
    gradeData.push(['Tổng cộng', totalStudents, 100]);

    const gradeWs = XLSX.utils.aoa_to_sheet(gradeData);

    // Set column widths
    gradeWs['!cols'] = [
      { wch: 25 }, // Xếp loại
      { wch: 15 }, // Số lượng
      { wch: 15 }, // Tỷ lệ
    ];

    // Merge title cell
    gradeWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    ];

    XLSX.utils.book_append_sheet(wb, gradeWs, 'Phân bổ điểm');
  }

  // ─── Sheet 4: Score Histogram (optional chart data) ──────────────────────
  
  const histogramData: (string | number)[][] = [
    ['BIỂU ĐỒ PHÂN BỔ ĐIỂM'],
    [],
    ['Khoảng điểm', 'Số học sinh'],
  ];

  report.scoreHistogram.forEach((h) => {
    histogramData.push([h.range, h.count]);
  });

  const histogramWs = XLSX.utils.aoa_to_sheet(histogramData);

  histogramWs['!cols'] = [
    { wch: 15 }, // Khoảng điểm
    { wch: 15 }, // Số học sinh
  ];

  histogramWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
  ];

  XLSX.utils.book_append_sheet(wb, histogramWs, 'Biểu đồ');

  // ─── Save Excel ────────────────────────────────────────────────────────────
  
  const filename = `BaoCao_${exam.title?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'Exam'}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

export function prepareStudentScores(
  submissions: BackendSubmission[],
  passingScore: number = 5
): StudentScore[] {
  return submissions
    .filter((s) => s.status === 'graded' || s.status === 'reviewed')
    .map((s): StudentScore => {
      const score = s.score || 0;
      const status: StudentScore['status'] = isPassing(score, passingScore) ? 'pass' : 'fail';
      return {
        name: s.studentId?.name || 'Unknown',
        score,
        grade: calculateGrade(score),
        status,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function prepareGradeDistribution(report: ExamReport): GradeDistributionRow[] {
  return report.gradeDistribution.map((gradeRow) => ({
    grade: gradeRow.grade,
    count: gradeRow.count,
    percentage: gradeRow.percentage,
  }));
}

// ─── OMR Template PDF Export (server-side) ───────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportOmrTemplatePdf(
  templateId: string,
  examTitle: string,
  schoolName?: string
): Promise<void> {
  // Fetch pre-rendered PDF from server. Server uses PDFKit — same coordinate
  // path as the /json endpoint, guaranteeing alignment with mobile overlay.
  const params = new URLSearchParams({ examTitle, schoolName: schoolName || '' });
  const response = await fetch(
    `${env.apiUrl}/omr-templates/${templateId}/pdf?${params}`,
    { headers: apiService.getHeaders() }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(err.message || `Lỗi ${response.status}: Xuất phiếu trả lời thất bại`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    const text = await response.text().catch(() => '');
    throw new Error(`Server trả về không phải PDF: ${contentType} — ${text.slice(0, 100)}`);
  }

  const blob = await response.blob();
  if (blob.size === 0) throw new Error('File PDF rỗng (0 bytes)');

  const safe = examTitle?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'OMR';
  downloadBlob(blob, `PhieuTraLoi_${safe}_${Date.now()}.pdf`);
}

export async function exportOmrTemplateVersionSheetsPdf(
  templateId: string,
  versionCodes: string[],
  examTitle: string,
  schoolName?: string
): Promise<void> {
  if (versionCodes.length === 1) {
    // Single version — same endpoint as regular PDF
    await exportOmrTemplatePdf(templateId, examTitle, schoolName);
    return;
  }

  // Multiple versions — call the versions endpoint (returns ZIP)
  const response = await fetch(
    `${env.apiUrl}/omr-templates/${templateId}/pdf/versions`,
    {
      method: 'POST',
      headers: { ...apiService.getHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ versions: versionCodes, examTitle, schoolName }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(err.message || `Lỗi ${response.status}: Xuất phiếu trả lời nhiều đề thất bại`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('zip') && !contentType.includes('pdf')) {
    const text = await response.text().catch(() => '');
    throw new Error(`Server trả về không phải ZIP: ${contentType} — ${text.slice(0, 100)}`);
  }

  const blob = await response.blob();
  if (blob.size === 0) throw new Error('File ZIP rỗng (0 bytes)');

  const safe = examTitle?.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '_') || 'OMR';
  downloadBlob(blob, `PhieuTraLoi_${safe}_all_versions_${Date.now()}.zip`);
}
