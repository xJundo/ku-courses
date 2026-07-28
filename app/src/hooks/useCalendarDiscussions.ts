import { useCallback, useEffect, useState } from 'react';
import { calendarApi } from '@/lib/api';
import type { CommentThreads } from '@/types/course';

/**
 * Loads every per-course discussion thread of the active calendar in one call,
 * then keeps them in sync locally as messages are posted or removed.
 */
export function useCalendarDiscussions(calendarId: string | null) {
  const [threads, setThreads] = useState<CommentThreads>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!calendarId) {
      setThreads({});
      return;
    }
    setLoading(true);
    try {
      const res = await calendarApi.listComments(calendarId);
      setThreads(res.threads);
    } catch {
      setThreads({});
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addComment = useCallback(
    async (courseKey: string, body: string) => {
      if (!calendarId) return;
      const res = await calendarApi.addComment(calendarId, courseKey, body);
      setThreads(prev => ({
        ...prev,
        [courseKey]: [...(prev[courseKey] ?? []), res.comment]
      }));
    },
    [calendarId]
  );

  const removeComment = useCallback(
    async (courseKey: string, commentId: string) => {
      if (!calendarId) return;
      await calendarApi.removeComment(calendarId, commentId);
      setThreads(prev => ({
        ...prev,
        [courseKey]: (prev[courseKey] ?? []).filter(comment => comment.id !== commentId)
      }));
    },
    [calendarId]
  );

  const totalCount = Object.values(threads).reduce((acc, list) => acc + list.length, 0);

  return { threads, loading, refresh, addComment, removeComment, totalCount };
}
