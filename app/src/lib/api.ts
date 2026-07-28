import type {
  AuthUser,
  CalendarSummary,
  Category,
  CommentThreads,
  CommunityCalendar,
  Course,
  CourseComment
} from '@/types/course';

/** Thrown for any non-2xx API response, carrying the server's French message. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init
    });
  } catch {
    throw new ApiError('Serveur injoignable. Vérifiez votre connexion.', 0);
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(payload?.error || `Erreur ${res.status}`, res.status);
  }
  return payload as T;
}

export interface CalendarPayload {
  name?: string;
  description?: string;
  selectedCourseKeys?: string[];
  categoryOverrides?: Record<string, Category>;
  ratings?: Record<string, number>;
  notes?: Record<string, string>;
  customCourses?: Course[];
  totalCredits?: number;
}

export const authApi = {
  me: () => request<{ user: AuthUser | null }>('/auth/me'),

  register: (email: string, password: string, displayName: string) =>
    request<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName })
    }),

  login: (email: string, password: string) =>
    request<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),

  updateDisplayName: (displayName: string) =>
    request<{ user: AuthUser }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName })
    })
};

export const calendarApi = {
  list: () => request<{ calendars: CalendarSummary[] }>('/calendars'),

  get: (id: string) => request<{ calendar: CommunityCalendar }>(`/calendars/${id}`),

  create: (payload: CalendarPayload) =>
    request<{ calendar: CommunityCalendar }>('/calendars', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  update: (id: string, payload: CalendarPayload) =>
    request<{ calendar: CommunityCalendar }>(`/calendars/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  remove: (id: string) => request<{ ok: true }>(`/calendars/${id}`, { method: 'DELETE' }),

  listComments: (id: string) => request<{ threads: CommentThreads }>(`/calendars/${id}/comments`),

  addComment: (id: string, courseKey: string, body: string) =>
    request<{ comment: CourseComment }>(`/calendars/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ courseKey, body })
    }),

  removeComment: (id: string, commentId: string) =>
    request<{ ok: true }>(`/calendars/${id}/comments/${commentId}`, { method: 'DELETE' })
};
