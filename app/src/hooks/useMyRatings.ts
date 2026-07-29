import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ratingApi } from '@/lib/api';
import { loadLocalStorage, saveLocalStorage } from '@/utils/storage';
import { useLocalStorageState } from './useLocalStorage';

type RatingMap = Record<string, number>;
type NoteMap = Record<string, string>;

/**
 * Which account the localStorage copy currently belongs to. `null` means it is
 * anonymous — ratings made before signing in, which the next account to sign in
 * adopts. A different id means the copy belongs to somebody else and must be
 * dropped rather than imported.
 */
const OWNER_KEY = 'ku_ratings_owner';

/**
 * Ratings and private notes of the *current profile*.
 *
 * They used to be stored on whichever calendar was open, so loading someone
 * else's calendar replaced your ratings with theirs and saving pushed yours
 * over theirs. They are now owned by the account.
 *
 * Signed out, the browser keeps them in localStorage exactly like before; the
 * first time an account signs in on that browser those local ratings are
 * imported into it, so nothing rated before this change is lost.
 */
export function useMyRatings() {
  const { user, loading: authLoading } = useAuth();

  const [ratings, setRatings] = useLocalStorageState<RatingMap>('ku_ratings', {});
  const [notes, setNotes] = useLocalStorageState<NoteMap>('ku_comments', {});
  const [syncing, setSyncing] = useState(false);

  // Latest values, readable from callbacks without re-subscribing them.
  const ratingsRef = useRef(ratings);
  const notesRef = useRef(notes);
  ratingsRef.current = ratings;
  notesRef.current = notes;

  const syncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || syncedUserRef.current === user.id) return;
    syncedUserRef.current = user.id;

    const pull = async () => {
      setSyncing(true);
      try {
        const owner = loadLocalStorage<string | null>(OWNER_KEY, null);
        const adoptLocal = owner === null;

        const remote = adoptLocal
          ? await ratingApi.importLocal({
              ratings: ratingsRef.current,
              notes: notesRef.current
            })
          : await ratingApi.mine();

        setRatings(remote.ratings || {});
        setNotes(remote.notes || {});
        saveLocalStorage(OWNER_KEY, user.id);

        if (adoptLocal) {
          const imported = 'imported' in remote ? Number(remote.imported) : 0;
          if (imported > 0) {
            toast.success(`${imported} note(s) de ce navigateur rattachée(s) à votre profil.`);
          }
        }
      } catch {
        // Offline or a server hiccup: the localStorage copy stays authoritative
        // and the next sign-in retries.
        syncedUserRef.current = null;
      } finally {
        setSyncing(false);
      }
    };

    void pull();
  }, [authLoading, user, setRatings, setNotes]);

  // Signing out leaves nothing behind: the ratings on screen belong to the
  // account that just left, and the next account must not inherit them.
  useEffect(() => {
    if (authLoading || user) return;
    syncedUserRef.current = null;
    if (loadLocalStorage<string | null>(OWNER_KEY, null) === null) return;

    saveLocalStorage(OWNER_KEY, null);
    setRatings({});
    setNotes({});
  }, [authLoading, user, setRatings, setNotes]);

  /** Writes one course through, rolling back if the server refuses. */
  const persist = useCallback(
    async (courseKey: string, rating: number, note: string) => {
      if (!user) return;
      const previousRating = ratingsRef.current[courseKey] || 0;
      const previousNote = notesRef.current[courseKey] || '';
      try {
        await ratingApi.set(courseKey, rating, note);
      } catch {
        toast.error('Note non enregistrée sur votre profil.');
        setRatings(prev => withValue(prev, courseKey, previousRating, value => value > 0));
        setNotes(prev => withValue(prev, courseKey, previousNote, value => value.length > 0));
      }
    },
    [user, setRatings, setNotes]
  );

  const setRating = useCallback(
    (courseKey: string, rating: number) => {
      setRatings(prev => withValue(prev, courseKey, rating, value => value > 0));
      void persist(courseKey, rating, notesRef.current[courseKey] || '');
    },
    [persist, setRatings]
  );

  const setNote = useCallback(
    (courseKey: string, note: string) => {
      const trimmed = note.trim();
      setNotes(prev => withValue(prev, courseKey, trimmed, value => value.length > 0));
      void persist(courseKey, ratingsRef.current[courseKey] || 0, trimmed);
    },
    [persist, setNotes]
  );

  return { ratings, notes, setRating, setNote, syncing };
}

/** Sets a key, or removes it when the value is the empty one. */
function withValue<T>(map: Record<string, T>, key: string, value: T, keep: (value: T) => boolean) {
  const next = { ...map };
  if (keep(value)) next[key] = value;
  else delete next[key];
  return next;
}
