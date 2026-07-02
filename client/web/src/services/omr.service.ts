import { ApiException } from '../core/errors';
import env from '../config/env';

const API_BASE = env.apiUrl;

export interface OMRUploadResult {
  id: string;
  status: string;
  submissionId: string;
  totalScore: number;
  maxScore: number;
  answerCount: number;
  detectedAnswers: Record<string, string>;
  confidence: number;
  templateId: string;
  imageUrl?: string;
}

export interface OMRTemplate {
  _id: string;
  name: string;
  code: string;
  zones?: Record<string, unknown>;
  questionCount?: number;
  rowCount?: number;
}

export interface SubmissionAnswer {
  position: number;
  selectedAnswer: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export class OMRService {
  private getToken(): string | null {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.state?.token || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new ApiException(data.message || `Server error: ${response.status}`, response.status);
    }
    const text = await response.text();
    if (!text) return undefined as T;
    try {
      const json: ApiResponse<T> = JSON.parse(text);
      return json.data ?? (json as unknown as T);
    } catch {
      throw new ApiException('Invalid JSON response', 500);
    }
  }

  /**
   * Scan an OMR sheet image and get results.
   * BE endpoint: POST /submissions/scan
   * Requires examId. Optionally pass classId if known.
   */
  async scanSheet(params: {
    examId: string;
    classId?: string;
    imageUrl: string;
    originalPublicId?: string;
    deviceInfo?: { platform: string; deviceModel?: string; appVersion?: string };
  }): Promise<OMRUploadResult> {
    const formData = new FormData();
    formData.append('examId', params.examId);
    if (params.classId) formData.append('classId', params.classId);
    formData.append('originalUrl', params.imageUrl);
    if (params.originalPublicId) formData.append('originalPublicId', params.originalPublicId);
    if (params.deviceInfo) {
      formData.append('deviceInfo', JSON.stringify(params.deviceInfo));
    }

    const response = await fetch(`${API_BASE}/submissions/scan`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });

    return this.handleResponse<OMRUploadResult>(response);
  }

  /**
   * Scan with base64 image instead of Cloudinary URL.
   */
  async scanSheetBase64(params: {
    examId: string;
    classId?: string;
    imageBase64: string;
    deviceInfo?: { platform: string; deviceModel?: string; appVersion?: string };
  }): Promise<OMRUploadResult> {
    const body = {
      examId: params.examId,
      ...(params.classId ? { classId: params.classId } : {}),
      image: params.imageBase64,
      ...(params.deviceInfo ? { deviceInfo: params.deviceInfo } : {}),
    };

    const response = await fetch(`${API_BASE}/submissions/scan`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return this.handleResponse<OMRUploadResult>(response);
  }

  /**
   * Submit corrected answers for a submission after manual editing.
   * BE endpoint: PATCH /submissions/:id/answers
   */
  async submitCorrectedAnswers(params: {
    submissionId: string;
    answers: Record<string, string>; // { "1": "A", "2": "B", ... }
  }): Promise<{ success: boolean; totalScore: number; maxScore: number }> {
    const response = await fetch(`${API_BASE}/submissions/${params.submissionId}/answers`, {
      method: 'PATCH',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers: params.answers }),
    });

    return this.handleResponse<{ success: boolean; totalScore: number; maxScore: number }>(response);
  }

  /**
   * Get OMR templates list.
   * BE endpoint: GET /omr-templates/
   */
  async getTemplates(): Promise<OMRTemplate[]> {
    const response = await fetch(`${API_BASE}/omr-templates/`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<OMRTemplate[]>(response);
  }

  /**
   * Get OMR templates for a specific exam.
   * BE endpoint: GET /omr-templates/exam/:examId
   */
  async getTemplatesForExam(examId: string): Promise<OMRTemplate[]> {
    const response = await fetch(`${API_BASE}/omr-templates/exam/${examId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<OMRTemplate[]>(response);
  }

  /**
   * Get a single submission by ID.
   * BE endpoint: GET /submissions/:id
   */
  async getSubmission(submissionId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_BASE}/submissions/${submissionId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Record<string, unknown>>(response);
  }

  /**
   * Get submissions for an exam.
   * BE endpoint: GET /submissions/exam/:examId
   */
  async getSubmissionsByExam(examId: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ results: Record<string, unknown>[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await fetch(`${API_BASE}/submissions/exam/${examId}${query}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ results: Record<string, unknown>[]; total: number }>(response);
  }

  /**
   * Get submission statistics for an exam.
   * BE endpoint: GET /submissions/exam/:examId/statistics
   */
  async getExamStatistics(examId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_BASE}/submissions/exam/${examId}/statistics`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Record<string, unknown>>(response);
  }

  async uploadAndProcess(file: File, templateId: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', templateId);
    const response = await fetch(`${API_BASE}/omr/upload`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });
    return this.handleResponse<any>(response);
  }

  async matchSheetToExam(sheetId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/omr/match`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sheetId }),
    });
    return this.handleResponse<any>(response);
  }

  async submitSheet(sheetId: string, answers: Record<string, string>, examId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/omr/submit`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sheetId, answers, examId }),
    });
    return this.handleResponse<any>(response);
  }

  async getProcessingStatus(sheetId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/omr/status/${sheetId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }
}

export const omrService = new OMRService();
