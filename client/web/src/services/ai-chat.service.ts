import { ApiException } from '../core/errors';
import type { AIReport } from '../types';
import env from '../config/env';

const API_BASE = env.apiUrl;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SendMessageParams {
  message: string;
  history?: ChatMessage[];
  context?: {
    examId?: string;
    questionId?: string;
    subjectId?: string;
    studentId?: string;
  };
}

export interface AIChatResponse {
  id: string;
  content: string;
  createdAt: string;
}

export interface ConversationResponse {
  id: string;
}

export interface ApiErrorResponse {
  success: false;
  message?: string;
  [key: string]: unknown;
}

export class AIChatService {
  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
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
      const text = await response.text().catch(() => '');
      let message = 'Unknown error';
      try {
        const data: ApiErrorResponse = JSON.parse(text);
        message = data.message || message;
      } catch {
        // Use default message
      }
      throw new ApiException(message, response.status);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    try {
      const json = JSON.parse(text);
      return json.data as T;
    } catch {
      throw new ApiException('Invalid JSON response', 500);
    }
  }

  async sendMessage(params: SendMessageParams): Promise<AIChatResponse> {
    const response = await fetch(`${API_BASE}/ai-chat/send`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        message: params.message,
        history: params.history,
        context: params.context,
      }),
    });

    return this.handleResponse<AIChatResponse>(response);
  }

  async getReports(options?: {
    subjectId?: string;
    examId?: string;
    limit?: number;
  }): Promise<AIReport[]> {
    const searchParams = new URLSearchParams();
    if (options?.subjectId) searchParams.set('subjectId', options.subjectId);
    if (options?.examId) searchParams.set('examId', options.examId);
    if (options?.limit) searchParams.set('limit', String(options.limit));

    const queryString = searchParams.toString();
    const url = `${API_BASE}/ai-chat/reports${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<AIReport[]>(response);
  }

  async createConversation(subjectId?: string): Promise<ConversationResponse> {
    const response = await fetch(`${API_BASE}/ai-chat/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ subjectId }),
    });

    return this.handleResponse<ConversationResponse>(response);
  }

  async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
    const response = await fetch(`${API_BASE}/ai-chat/history/${conversationId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ChatMessage[]>(response);
  }
}

export const aiChatService = new AIChatService();
