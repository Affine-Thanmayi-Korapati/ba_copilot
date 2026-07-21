const API_BASE = '/api';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AnalysisSession {
  id: string;
  userId: string;
  title: string;
  meetingNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStory {
  title: string;
  story: string;
  acceptanceCriteria: string[];
}

export interface AIAnalysis {
  id: string;
  sessionId: string;
  executiveSummary: string;
  functionalRequirements: string[];
  userStories: UserStory[];
  risks: string[];
  assumptions: string[];
  clarifyingQuestions: string[];
  createdAt: string;
}

// Get JWT Token from storage
export function getToken(): string | null {
  return localStorage.getItem('ba_copilot_token');
}

// Save token and user details to storage
export function setAuth(token: string, user: User) {
  localStorage.setItem('ba_copilot_token', token);
  localStorage.setItem('ba_copilot_user', JSON.stringify(user));
}

// Clear auth details from storage
export function clearAuth() {
  localStorage.removeItem('ba_copilot_token');
  localStorage.removeItem('ba_copilot_user');
}

// Get logged in user details
export function getSavedUser(): User | null {
  const userJson = localStorage.getItem('ba_copilot_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  const msg = typeof error === 'string' ? error : (error.message || '');
  const lowercaseMsg = msg.toLowerCase();

  // 1. Authentication / Registration specific messages (highest precedence)
  if (
    lowercaseMsg.includes('invalid credentials') || 
    lowercaseMsg.includes('invalid email or password') ||
    lowercaseMsg.includes('incorrect password')
  ) {
    return 'The email or password you entered is incorrect. Please double-check and try again.';
  }

  if (
    lowercaseMsg.includes('user with this email already exists') ||
    lowercaseMsg.includes('email already in use') || 
    lowercaseMsg.includes('already registered') ||
    lowercaseMsg.includes('email already registered')
  ) {
    return 'This email address is already registered. Please sign in or use a different email.';
  }

  if (lowercaseMsg.includes('password must be at least')) {
    return 'For security, your password must be at least 6 characters long.';
  }

  // 2. Form validation
  if (lowercaseMsg.includes('both title and meeting notes are required') || lowercaseMsg.includes('title and meeting notes are required')) {
    return 'Please provide both a session title and the meeting notes before continuing.';
  }

  if (lowercaseMsg.includes('cannot analyze empty')) {
    return 'Please add some meeting notes text before generating an analysis.';
  }

  // 3. Authorization/Authentication status
  if (
    lowercaseMsg.includes('unauthorized') || 
    lowercaseMsg.includes('token') || 
    lowercaseMsg.includes('jwt') ||
    lowercaseMsg.includes('status: 401')
  ) {
    return 'Your session has expired or is invalid. Please sign in again to continue.';
  }

  // 4. Permissions
  if (
    lowercaseMsg.includes('forbidden') || 
    lowercaseMsg.includes('status: 403')
  ) {
    return 'You do not have permission to access or modify this resource.';
  }

  // 5. Not Found
  if (
    lowercaseMsg.includes('not found') || 
    lowercaseMsg.includes('status: 404')
  ) {
    return 'The requested record could not be found. It may have been deleted.';
  }

  // 6. AI / Gemini Errors (AI specific)
  if (
    lowercaseMsg.includes('gemini') ||
    lowercaseMsg.includes('ai') ||
    lowercaseMsg.includes('google') ||
    lowercaseMsg.includes('api_key') ||
    lowercaseMsg.includes('apikey') ||
    lowercaseMsg.includes('quota') ||
    lowercaseMsg.includes('safety') ||
    lowercaseMsg.includes('model')
  ) {
    return 'The AI assistant is temporarily unavailable. Please try again in a few moments.';
  }

  // 7. Connection / Server Offline
  if (
    lowercaseMsg.includes('failed to fetch') || 
    lowercaseMsg.includes('fetch failed') || 
    lowercaseMsg.includes('networkerror') || 
    lowercaseMsg.includes('econnrefused') ||
    lowercaseMsg.includes('status: 502') ||
    lowercaseMsg.includes('status: 503') ||
    lowercaseMsg.includes('status: 504')
  ) {
    return 'We are unable to reach the server. Please check your internet connection and try again.';
  }

  // 8. Database / Server Internal Errors (no technical jargon)
  if (
    lowercaseMsg.includes('prisma') ||
    lowercaseMsg.includes('database') ||
    lowercaseMsg.includes('sql') ||
    lowercaseMsg.includes('postgres') ||
    lowercaseMsg.includes('neon') ||
    lowercaseMsg.includes('connection pool') ||
    lowercaseMsg.includes('query raw') ||
    lowercaseMsg.includes('foreign key') ||
    lowercaseMsg.includes('unique constraint') ||
    lowercaseMsg.includes('status: 500') ||
    lowercaseMsg.includes('internal server error') ||
    lowercaseMsg.includes('typeerror') ||
    lowercaseMsg.includes('syntaxerror') ||
    lowercaseMsg.includes('referenceerror') ||
    lowercaseMsg.includes('rangeerror') ||
    lowercaseMsg.includes('undefined') ||
    lowercaseMsg.includes('null') ||
    lowercaseMsg.includes('[object') ||
    lowercaseMsg.includes('unexpected token') ||
    lowercaseMsg.includes('json.parse') ||
    lowercaseMsg.includes('fetch') ||
    lowercaseMsg.includes('http error') ||
    lowercaseMsg.includes('exception') ||
    lowercaseMsg.includes('stack trace') ||
    lowercaseMsg.includes('uuid') ||
    lowercaseMsg.includes('bad request') ||
    lowercaseMsg.includes('invalid input')
  ) {
    return 'A temporary server error occurred. Please try again in a few moments.';
  }

  // 9. Fallback: if it contains syntax/code noise, replace with a clean fallback.
  if (msg.includes('{') || msg.includes('[') || msg.includes(':') || msg.includes('/') || msg.includes('\\') || msg.includes('Error:')) {
    return 'An unexpected error occurred. Please try again.';
  }

  return msg || 'An unexpected error occurred. Please try again.';
}

// Helper to execute authenticated fetch requests
async function authFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

// Auth API operations
export const authApi = {
  async register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Registration failed');
    }

    const data = await response.json();
    setAuth(data.token, data.user);
    return data;
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    setAuth(data.token, data.user);
    return data;
  }
};

// Sessions and Analysis API operations
export const sessionsApi = {
  async list(): Promise<AnalysisSession[]> {
    return authFetch('/sessions');
  },

  async get(id: string): Promise<{ session: AnalysisSession; analysis: AIAnalysis | null }> {
    return authFetch(`/sessions/${id}`);
  },

  async create(title: string, meetingNotes: string): Promise<AnalysisSession> {
    return authFetch('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, meetingNotes })
    });
  },

  async update(id: string, payload: { title?: string; meetingNotes?: string; analysis?: Partial<AIAnalysis> }): Promise<{ session: AnalysisSession; analysis: AIAnalysis | null }> {
    return authFetch(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return authFetch(`/sessions/${id}`, {
      method: 'DELETE'
    });
  },

  async generate(sessionId: string): Promise<AIAnalysis> {
    return authFetch('/analysis/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  },

  async exportMarkdown(sessionId: string, title: string, analysis: any): Promise<string> {
    const data = await authFetch('/export/markdown', {
      method: 'POST',
      body: JSON.stringify({ sessionId, title, analysis })
    });
    return data.markdown;
  },

  async logExportPDF(sessionId: string): Promise<any> {
    return authFetch('/export/pdf', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  }
};
