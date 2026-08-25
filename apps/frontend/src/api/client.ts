const API_BASE = '/api/v1';

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem('sfs_auth_token');
  }

  public static setToken(token: string): void {
    localStorage.setItem('sfs_auth_token', token);
  }

  public static clearToken(): void {
    localStorage.removeItem('sfs_auth_token');
  }

  public static async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP ${response.status}` };
      }
      throw { status: response.status, ...errorData };
    }

    return (await response.json()) as T;
  }
}
