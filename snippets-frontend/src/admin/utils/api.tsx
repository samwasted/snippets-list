import type { 
  User, 
  UsersResponse, 
  SpacesResponse, 
  MapResponse, 
  AnalyticsViewsResponse, 
  PopularContentResponse,
  SnippetResponse,
  AnalyticsParams
} from "../types/admin";

const API_BASE = `${import.meta.env.VITE_HTTP_URL}/api/v1/admin`
export class ApiClient {
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options,
    });

    if (!response.ok) {
      // Handle 401 unauthorized - token might be expired
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }

      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  async getUsers(page = 1, limit = 20, search?: string): Promise<UsersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  
  return this.request<UsersResponse>(`/users?${params.toString()}`);
}

  async updateUser(userId: string, data: Partial<User>): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>(`/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/user/${userId}`, { method: 'DELETE' });
  }

  async getSpaces(page = 1, limit = 20, search?: string): Promise<SpacesResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  
  return this.request<SpacesResponse>(`/spaces?${params.toString()}`);
}

  async updateSpace(spaceId: string, data: any): Promise<{ message: string; space: any }> {
    return this.request<{ message: string; space: any }>(`/space/${spaceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSpace(spaceId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/space/${spaceId}`, { method: 'DELETE' });
  }

  async getSnippet(snippetId: string): Promise<SnippetResponse> {
    return this.request<SnippetResponse>(`/snippet/${snippetId}`);
  }

  async updateSnippet(snippetId: string, data: any): Promise<{ message: string; snippet: any }> {
    return this.request<{ message: string; snippet: any }>(`/snippet/${snippetId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSnippet(snippetId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/snippet/${snippetId}`, { method: 'DELETE' });
  }

  async getMap(page = 1, limit = 50): Promise<MapResponse> {
    return this.request<MapResponse>(`/map?page=${page}&limit=${limit}`);
  }

  async getAnalyticsViews(params: AnalyticsParams = {}): Promise<AnalyticsViewsResponse> {
    const query = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value.toString();
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    return this.request<AnalyticsViewsResponse>(`/analytics/views?${query}`);
  }

  async getPopularContent(page = 1, limit = 10): Promise<PopularContentResponse> {
    return this.request<PopularContentResponse>(`/analytics/popular?page=${page}&limit=${limit}`);
  }

  // Add authentication methods
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('adminToken', data.token);
    return data;
  }

  logout(): void {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  }
}

export const apiClient = new ApiClient();
