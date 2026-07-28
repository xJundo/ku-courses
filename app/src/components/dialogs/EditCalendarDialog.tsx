import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { CalendarSummary } from '@/types/course';

interface EditCalendarDialogProps {
  /** The calendar being edited; `null` keeps the dialog closed. */
  calendar: CalendarSummary | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, name: string, description: string) => Promise<unknown>;
}

export function EditCalendarDialog({ calendar, onOpenChange, onSave }: EditCalendarDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);

  // Refill the form each time another calendar is opened for editing.
  useEffect(() => {
    if (calendar) {
      setName(calendar.name);
      setDescription(calendar.description || '');
    }
  }, [calendar]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!calendar || name.trim().length < 2) return;

    setPending(true);
    const saved = await onSave(calendar.id, name.trim(), description.trim());
    setPending(false);

    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(calendar)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilIcon className="size-5" />
            Modifier le calendrier
          </DialogTitle>
          <DialogDescription>
            Renommez votre calendrier et mettez sa note à jour. Les changements sont visibles
            immédiatement par la communauté.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="edit-calendar-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-calendar-name">Nom du calendrier</FieldLabel>
              <Input
                id="edit-calendar-name"
                required
                minLength={2}
                maxLength={120}
                autoFocus
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="ex : Semestre automne — track IT"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-calendar-description">Note (optionnel)</FieldLabel>
              <Textarea
                id="edit-calendar-description"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="ex : Track IT + Coréen, 15 crédits, 3 jours de cours"
                className="resize-none"
              />
              <FieldDescription>
                Affichée sous le nom du calendrier dans la liste communautaire.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="edit-calendar-form"
            disabled={pending || name.trim().length < 2}
          >
            {pending ? <Spinner data-icon="inline-start" /> : <PencilIcon data-icon="inline-start" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
