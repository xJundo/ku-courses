import type {
  AuthUser,
  CalendarSummary,
  CalendarVisibility,
  Category,
  CommentThreads,
  CommunityCalendar,
  Course,
  CourseComment,
  Profile,
  ProfileRating,
  SharedUser
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
  visibility?: CalendarVisibility;
  /** Profile ids allowed to open a `restricted` calendar. */
  sharedWith?: string[];
  selectedCourseKeys?: string[];
  categoryOverrides?: Record<string, Category>;
  customCourses?: Course[];
  totalCredits?: number;
}

/** The signed-in user's own ratings and private notes, keyed by course. */
export interface MyRatings {
  ratings: Record<string, number>;
  notes: Record<string, string>;
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
  /** Everything the viewer may see, optionally narrowed to one owner. */
  list: (ownerId?: string) =>
    request<{ calendars: CalendarSummary[] }>(
      ownerId ? `/calendars?owner=${encodeURIComponent(ownerId)}` : '/calendars'
    ),

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
    request<{ ok: true }>(`/calendars/${id}/comments/${commentId}`, { method: 'DELETE' }),

  getShares: (id: string) =>
    request<{ visibility: CalendarVisibility; sharedWith: SharedUser[] }>(
      `/calendars/${id}/shares`
    ),

  setShares: (id: string, visibility: CalendarVisibility, sharedWith: string[]) =>
    request<{ visibility: CalendarVisibility; sharedWith: SharedUser[] }>(
      `/calendars/${id}/shares`,
      { method: 'PUT', body: JSON.stringify({ visibility, sharedWith }) }
    )
};

export const userApi = {
  /** `query` may be typed with or without a leading `@`. */
  list: (query = '') =>
    request<{ users: Profile[] }>(`/users?q=${encodeURIComponent(query.replace(/^@+/, ''))}`),

  get: (idOrHandle: string) =>
    request<{ profile: Profile }>(`/users/${encodeURIComponent(idOrHandle.replace(/^@+/, ''))}`),

  ratings: (id: string) => request<{ ratings: ProfileRating[] }>(`/users/${id}/ratings`),

  /** Discussion threads on this profile's ratings, grouped by course key. */
  listComments: (id: string) => request<{ threads: CommentThreads }>(`/users/${id}/comments`),

  addComment: (id: string, courseKey: string, body: string) =>
    request<{ comment: CourseComment }>(`/users/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ courseKey, body })
    }),

  removeComment: (id: string, commentId: string) =>
    request<{ ok: true }>(`/users/${id}/comments/${commentId}`, { method: 'DELETE' })
};

export const ratingApi = {
  mine: () => request<MyRatings>('/ratings/me'),

  set: (courseKey: string, rating: number, note: string) =>
    request<{ courseKey: string; rating: number; note: string }>(
      `/ratings/me/${encodeURIComponent(courseKey)}`,
      { method: 'PUT', body: JSON.stringify({ rating, note }) }
    ),

  /** Merges ratings kept in localStorage into the account; server rows win. */
  importLocal: (payload: MyRatings) =>
    request<MyRatings & { imported: number }>('/ratings/me/import', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
