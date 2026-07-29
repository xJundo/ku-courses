import { useCallback, useEffect, useState } from 'react';
import { userApi } from '@/lib/api';
import type { CommentThreads } from '@/types/course';

/**
 * Loads every discussion thread hanging off a profile's ratings in one call —
 * the profile-page counterpart of `useCalendarDiscussions` — then keeps them in
 * sync locally as messages are posted or removed.
 */
export function useProfileDiscussions(profileId: string | null) {
  const [threads, setThreads] = useState<CommentThreads>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!profileId) {
      setThreads({});
      return;
    }
    setLoading(true);
    try {
      const res = await userApi.listComments(profileId);
      setThreads(res.threads);
    } catch {
      setThreads({});
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addComment = useCallback(
    async (courseKey: string, body: string) => {
      if (!profileId) return;
      const res = await userApi.addComment(profileId, courseKey, body);
      setThreads(prev => ({
        ...prev,
        [courseKey]: [...(prev[courseKey] ?? []), res.comment]
      }));
    },
    [profileId]
  );

  const removeComment = useCallback(
    async (courseKey: string, commentId: string) => {
      if (!profileId) return;
      await userApi.removeComment(profileId, commentId);
      setThreads(prev => ({
        ...prev,
        [courseKey]: (prev[courseKey] ?? []).filter(comment => comment.id !== commentId)
      }));
    },
    [profileId]
  );

  return { threads, loading, refresh, addComment, removeComment };
}
