import { useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarPlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface CreateCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCourseCount: number;
  onCreate: (name: string, description: string, copyCurrent: boolean) => Promise<unknown>;
}

export function CreateCalendarDialog({
  open,
  onOpenChange,
  currentCourseCount,
  onCreate
}: CreateCalendarDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyCurrent, setCopyCurrent] = useState(true);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setPending(true);
    const created = await onCreate(name.trim(), description.trim(), copyCurrent);
    setPending(false);

    if (created) {
      setName('');
      setDescription('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlusIcon className="size-5" />
            Nouveau calendrier
          </DialogTitle>
          <DialogDescription>
            Il sera publié immédiatement dans les calendriers communautaires. Vous seul pouvez le
            modifier ; les autres étudiants peuvent le consulter, le dupliquer et commenter ses
            cours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="create-calendar-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="calendar-name">Nom du calendrier</FieldLabel>
              <Input
                id="calendar-name"
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
              <FieldLabel htmlFor="calendar-description">Note (optionnel)</FieldLabel>
              <Textarea
                id="calendar-description"
                rows={2}
                maxLength={1000}
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="ex : Track IT + Coréen, 15 crédits, 3 jours de cours"
                className="resize-none"
              />
            </Field>

            <Field orientation="horizontal">
              <Switch id="copy-current" checked={copyCurrent} onCheckedChange={setCopyCurrent} />
              <div className="flex flex-col gap-0.5">
                <FieldTitle>
                  <FieldLabel htmlFor="copy-current">Inclure ma sélection actuelle</FieldLabel>
                </FieldTitle>
                <FieldDescription>
                  {currentCourseCount > 0
                    ? `${currentCourseCount} cours sélectionnés seront enregistrés.`
                    : 'Aucun cours sélectionné : le calendrier sera vide.'}
                </FieldDescription>
              </div>
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="create-calendar-form" disabled={pending || !name.trim()}>
            {pending ? <Spinner data-icon="inline-start" /> : <CalendarPlusIcon data-icon="inline-start" />}
            Créer & publier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
