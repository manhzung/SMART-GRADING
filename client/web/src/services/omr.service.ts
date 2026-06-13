import { ApiException } from '../core/errors';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface OMRUploadResult {
  id: string;
  detectedAnswers: Record<string, string>;
  confidence: number;
  templateId: string;
  imageUrl?: string;
}

export interface OMRMatchResult {
  examId: string;
  title: string;
  matchScore: number;
}

export interface OMRSubmitResult {
  submissionId: string;
  status: string;
}

export interface OMRTemplate {
  id: string;
  name: string;
  questionCount: number;
  rowCount: number;
}

export interface OMRProcessingStatus {
  status: string;
  progress: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export class OMRService {
  private getToken(): string | null {
    // Match the key used by authStore persist middleware
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
      throw new ApiException(data.message || 'Server error', response.status);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    try {
      const json: ApiResponse<T> = JSON.parse(text);
      return json.data;
    } catch {
      throw new ApiException('Invalid JSON response', 500);
    }
  }

  async uploadAndProcess(file: File, templateId: string): Promise<OMRUploadResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('templateId', templateId);

    const response = await fetch(`${API_BASE}/omr/upload`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });

    return this.handleResponse<OMRUploadResult>(response);
  }

  async matchSheetToExam(sheetId: string): Promise<OMRMatchResult> {
    const response = await fetch(`${API_BASE}/omr/match-exam`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sheetId }),
    });

    return this.handleResponse<OMRMatchResult>(response);
  }

  async submitSheet(sheetId: string, answers: Record<string, string>, examId: string): Promise<OMRSubmitResult> {
    const response = await fetch(`${API_BASE}/omr/submit`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sheetId, answers, examId }),
    });

    return this.handleResponse<OMRSubmitResult>(response);
  }

  async getTemplates(): Promise<OMRTemplate[]> {
    const response = await fetch(`${API_BASE}/omr/templates`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<OMRTemplate[]>(response);
  }

  async getProcessingStatus(sheetId: string): Promise<OMRProcessingStatus> {
    const response = await fetch(`${API_BASE}/omr/status/${sheetId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<OMRProcessingStatus>(response);
  }
}

export const omrService = new OMRService();
