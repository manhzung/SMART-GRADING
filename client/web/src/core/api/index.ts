import { ApiException, AuthException } from '../errors';
import env from '../../config/env';

interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
}

interface RefreshTokensResponse {
  access: {
    token: string;
    expires: string;
  };
  refresh: {
    token: string;
    expires: string;
  };
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;

  constructor(baseUrl: string = env.apiUrl) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
  }

  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async refreshTokens(): Promise<string | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh-tokens`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const text = await response.text();
      if (!text) return null;

      const tokens: RefreshTokensResponse = JSON.parse(text);
      this.token = tokens.access.token;
      this.refreshToken = tokens.refresh.token;
      return tokens.access.token;
    } catch {
      return null;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Unknown error' }));
      if (response.status === 401) {
        throw new AuthException(data.message || 'Authentication failed');
      }
      throw new ApiException(data.message || 'Server error', response.status);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    let url = `${this.baseUrl}${endpoint}`;
    if (method === 'GET' && config?.params) {
      const params = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: (method !== 'GET' && data) ? JSON.stringify(data) : undefined,
    });

    if (response.status === 401 && this.refreshToken && !this.isRefreshing) {
      this.isRefreshing = true;
      const newToken = await this.refreshTokens();
      this.isRefreshing = false;

      if (newToken) {
        const retryResponse = await fetch(url, {
          method,
          headers: this.getHeaders(),
          body: (method !== 'GET' && data) ? JSON.stringify(data) : undefined,
        });
        return this.handleResponse<T>(retryResponse);
      } else {
        // Refresh failed — clear tokens so the caller (authStore) can redirect to login
        this.token = null;
        this.refreshToken = null;
      }
    }

    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PATCH', endpoint, data);
  }

  async delete<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('DELETE', endpoint, data);
  }
}

export const apiService = new ApiService();
export default ApiService;
