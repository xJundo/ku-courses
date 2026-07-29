import { useState } from 'react';
import type { FormEvent } from 'react';
import { MessagesSquareIcon, SendIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import type { CourseComment } from '@/types/course';

const MAX_LENGTH = 2000;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface CourseDiscussionProps {
  courseKey: string;
  comments: CourseComment[];
  /**
   * Whatever the thread hangs off — a calendar in the planner, a profile on a
   * profile page. `null` means there is nothing to discuss yet, and
   * `unavailable` is rendered instead.
   */
  threadId: string | null;
  unavailable?: { title: string; description: string };
  /** Appended to the heading, e.g. the calendar or profile the thread is on. */
  contextLabel?: string;
  heading?: string;
  placeholder?: string;
  onSend: (courseKey: string, body: string) => Promise<void>;
  onDelete: (courseKey: string, commentId: string) => Promise<void>;
  onRequireAuth: () => void;
}

export function CourseDiscussion({
  courseKey,
  comments,
  threadId,
  unavailable,
  contextLabel,
  heading = 'Discussion sur ce cours',
  placeholder = 'Votre message sur ce cours…',
  onSend,
  onDelete,
  onRequireAuth
}: CourseDiscussionProps) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);

  if (!threadId) {
    return (
      <Empty className="border-border rounded-lg border border-dashed py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessagesSquareIcon />
          </EmptyMedia>
          <EmptyTitle>{unavailable?.title ?? 'Aucune discussion active'}</EmptyTitle>
          <EmptyDescription>
            {unavailable?.description ??
              'Ouvrez un calendrier communautaire pour discuter de ce cours avec son auteur.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    const text = body.trim();
    if (!text) return;

    setPending(true);
    try {
      await onSend(courseKey, text);
      setBody('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible d'envoyer le message.");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await onDelete(courseKey, commentId);
      toast.success('Message supprimé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression impossible.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <MessagesSquareIcon className="size-4" />
        <span>
          {heading}
          {contextLabel ? ` · ${contextLabel}` : ''} ({comments.length})
        </span>
      </div>

      {comments.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-lg border border-dashed px-3 py-4 text-center text-xs">
          Aucun message pour l’instant. Lancez la discussion.
        </p>
      ) : (
        <ScrollArea className="max-h-64">
          <div className="flex flex-col gap-3 pr-3">
            {comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-2.5">
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{initials(comment.author)}</AvatarFallback>
                </Avatar>
                <div className="bg-muted/50 flex-1 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{comment.author}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-[10px]">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Supprimer le message"
                          onClick={() => void handleDelete(comment.id)}
                        >
                          <Trash2Icon />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Textarea
          value={body}
          maxLength={MAX_LENGTH}
          onChange={event => setBody(event.target.value)}
          placeholder={user ? placeholder : 'Connectez-vous pour participer à la discussion.'}
          disabled={!user}
          className="min-h-20 resize-none text-xs"
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[10px]">
            {user ? `Publié en tant que ${user.displayName}` : 'Compte requis pour répondre'}
          </span>
          {user ? (
            <Button type="submit" size="sm" disabled={pending || !body.trim()}>
              {pending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
              Envoyer
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={onRequireAuth}>
              Se connecter
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
