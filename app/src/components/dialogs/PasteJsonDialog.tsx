import { useState } from 'react';
import { ClipboardIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface PasteJsonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rawText: string) => void;
}

export function PasteJsonDialog({ open, onOpenChange, onSubmit }: PasteJsonDialogProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value);
    setValue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardIcon className="size-5" />
            Coller du JSON
          </DialogTitle>
          <DialogDescription>
            Collez un export de session (notes et commentaires) ou un catalogue brut copié depuis
            sugang.korea.ac.kr.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={value}
          onChange={event => setValue(event.target.value)}
          placeholder="Collez le texte JSON ici…"
          className="min-h-40 font-mono text-xs"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!value.trim()}>
            Analyser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
