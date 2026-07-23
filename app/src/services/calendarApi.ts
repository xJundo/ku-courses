import { CommunityCalendar, Category, Course } from '../types/course';
import { loadLocalStorage, saveLocalStorage } from '../utils/storage';

const API_BASE = '/api/index.php';
const LOCAL_STORAGE_KEY = 'ku_community_calendars_backup';

// Initial sample calendar for fallback
const SEED_CALENDARS: CommunityCalendar[] = [
  {
    id: 'cal_default_epitech',
    name: 'Exemple - Track IT & Business (3 Jours)',
    author: 'Communauté KU',
    description: 'Exemple de calendrier optimisé du lundi au mercredi.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selectedCourseKeys: ['COSE211_01', 'COSE341_01', 'BUSN101_01', 'KORE101_01'],
    categoryOverrides: {},
    ratings: { COSE211_01: 5 },
    comments: { COSE211_01: "Très recommandé pour l'échange" },
    customCourses: [],
    courseCount: 4,
    totalCredits: 12
  }
];

function getLocalCalendars(): CommunityCalendar[] {
  return loadLocalStorage<CommunityCalendar[]>(LOCAL_STORAGE_KEY, SEED_CALENDARS);
}

function saveLocalCalendars(cals: CommunityCalendar[]): void {
  saveLocalStorage(LOCAL_STORAGE_KEY, cals);
}

export const calendarApi = {
  async listCalendars(): Promise<{ success: boolean; calendars: Partial<CommunityCalendar>[]; isHostinger: boolean }> {
    try {
      const res = await fetch(`${API_BASE}?action=list`);
      const contentType = res.headers.get('content-type') || '';
      
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.calendars)) {
          return { success: true, calendars: data.calendars, isHostinger: true };
        }
      }
    } catch (err) {
      console.warn('API Hostinger non disponible, basculement sur le stockage local client:', err);
    }

    // Fallback to local storage
    const localCals = getLocalCalendars();
    const summaries = localCals.map(c => ({
      id: c.id,
      name: c.name,
      author: c.author,
      description: c.description,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      courseCount: c.selectedCourseKeys ? c.selectedCourseKeys.length : (c.courseCount || 0),
      totalCredits: c.totalCredits || 0
    }));

    return { success: true, calendars: summaries, isHostinger: false };
  },

  async getCalendar(id: string): Promise<{ success: boolean; calendar?: CommunityCalendar; error?: string; isHostinger: boolean }> {
    try {
      const res = await fetch(`${API_BASE}?action=get&id=${encodeURIComponent(id)}`);
      const contentType = res.headers.get('content-type') || '';
      
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.calendar) {
          return { success: true, calendar: data.calendar, isHostinger: true };
        }
      }
    } catch (err) {
      console.warn('API Hostinger fetch calendar err, fallback local:', err);
    }

    // Fallback local
    const localCals = getLocalCalendars();
    const found = localCals.find(c => c.id === id);
    if (found) {
      return { success: true, calendar: found, isHostinger: false };
    }
    return { success: false, error: 'Calendrier introuvable', isHostinger: false };
  },

  async createCalendar(payload: {
    name: string;
    author?: string;
    description?: string;
    selectedCourseKeys: string[];
    categoryOverrides: Record<string, Category>;
    ratings: Record<string, number>;
    comments: Record<string, string>;
    customCourses: Course[];
    totalCredits: number;
  }): Promise<{ success: boolean; calendar?: CommunityCalendar; error?: string; isHostinger: boolean }> {
    try {
      const res = await fetch(`${API_BASE}?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.calendar) {
          return { success: true, calendar: data.calendar, isHostinger: true };
        }
      }
    } catch (err) {
      console.warn('API Hostinger create err, fallback local:', err);
    }

    // Fallback local creation
    const now = new Date().toISOString();
    const newCal: CommunityCalendar = {
      id: `cal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: payload.name.trim() || 'Mon Calendrier',
      author: payload.author?.trim() || 'Étudiant',
      description: payload.description?.trim() || '',
      createdAt: now,
      updatedAt: now,
      selectedCourseKeys: payload.selectedCourseKeys || [],
      categoryOverrides: payload.categoryOverrides || {},
      ratings: payload.ratings || {},
      comments: payload.comments || {},
      customCourses: payload.customCourses || [],
      courseCount: (payload.selectedCourseKeys || []).length,
      totalCredits: payload.totalCredits || 0
    };

    const localCals = getLocalCalendars();
    localCals.unshift(newCal);
    saveLocalCalendars(localCals);

    return { success: true, calendar: newCal, isHostinger: false };
  },

  async updateCalendar(
    id: string,
    payload: {
      name?: string;
      author?: string;
      description?: string;
      selectedCourseKeys?: string[];
      categoryOverrides?: Record<string, Category>;
      ratings?: Record<string, number>;
      comments?: Record<string, string>;
      customCourses?: Course[];
      totalCredits?: number;
    }
  ): Promise<{ success: boolean; calendar?: CommunityCalendar; error?: string; isHostinger: boolean }> {
    try {
      const res = await fetch(`${API_BASE}?action=update&id=${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.calendar) {
          return { success: true, calendar: data.calendar, isHostinger: true };
        }
      }
    } catch (err) {
      console.warn('API Hostinger update err, fallback local:', err);
    }

    // Fallback local update
    const localCals = getLocalCalendars();
    const idx = localCals.findIndex(c => c.id === id);
    if (idx !== -1) {
      const existing = localCals[idx];
      const updated: CommunityCalendar = {
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString(),
        courseCount: payload.selectedCourseKeys ? payload.selectedCourseKeys.length : existing.courseCount
      };
      localCals[idx] = updated;
      saveLocalCalendars(localCals);
      return { success: true, calendar: updated, isHostinger: false };
    }

    return { success: false, error: 'Calendrier non trouvé localement', isHostinger: false };
  },

  async deleteCalendar(id: string): Promise<{ success: boolean; error?: string; isHostinger: boolean }> {
    try {
      const res = await fetch(`${API_BASE}?action=delete&id=${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          return { success: true, isHostinger: true };
        }
      }
    } catch (err) {
      console.warn('API Hostinger delete err, fallback local:', err);
    }

    // Local fallback delete
    const localCals = getLocalCalendars();
    const filtered = localCals.filter(c => c.id !== id);
    saveLocalCalendars(filtered);
    return { success: true, isHostinger: false };
  }
};
