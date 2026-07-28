import { useState } from 'react';
import type { FormEvent } from 'react';
import { PlusCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DAYS_FR, DAYS_SHORT, PERIODS_MAP } from '@/constants/schedule';
import type { Course, CustomCourseFormData } from '@/types/course';

const INITIAL_FORM: CustomCourseFormData = {
  COUR_CD: '',
  COUR_NM: '',
  CREDIT: '3',
  PROF_NM: '',
  DEPARTMENT: '',
  COUR_CLS: '00',
  DAY: 'Mon',
  START_PERIOD: '1',
  END_PERIOD: '2',
  ROOM: '',
  ENG_YN: '1'
};

interface CustomCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCourse: (course: Course) => void;
}

export function CustomCourseDialog({ open, onOpenChange, onAddCourse }: CustomCourseDialogProps) {
  const [form, setForm] = useState<CustomCourseFormData>(INITIAL_FORM);

  const update = <K extends keyof CustomCourseFormData>(key: K, value: CustomCourseFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    onAddCourse({
      COUR_CD: form.COUR_CD.toUpperCase().trim(),
      COUR_NM: form.COUR_NM.toUpperCase().trim(),
      CREDIT: form.CREDIT,
      TIME_ROOM: `${form.DAY}(${form.START_PERIOD}-${form.END_PERIOD}) ${form.ROOM}`,
      PROF_NM: form.PROF_NM,
      DEPARTMENT: form.DEPARTMENT,
      COUR_CLS: form.COUR_CLS,
      TIME: '',
      MOOC_YN: '0',
      NEMO_YN: '0',
      EXCH_COR_YN: '0',
      LMT_YN: '0',
      ENG_YN: form.ENG_YN
    });

    setForm(INITIAL_FORM);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircleIcon className="size-5" />
            Ajouter un cours sur-mesure
          </DialogTitle>
          <DialogDescription>
            Pour un engagement externe ou un cours absent du catalogue importé.
          </DialogDescription>
        </DialogHeader>

        <form id="custom-course-form" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="custom-code">Code du cours</FieldLabel>
              <Input
                id="custom-code"
                required
                value={form.COUR_CD}
                onChange={event => update('COUR_CD', event.target.value)}
                placeholder="ex : BDSC152"
                className="uppercase"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="custom-name">Nom complet du cours</FieldLabel>
              <Input
                id="custom-name"
                required
                value={form.COUR_NM}
                onChange={event => update('COUR_NM', event.target.value)}
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="custom-credit">Crédits</FieldLabel>
                <Select value={form.CREDIT} onValueChange={value => update('CREDIT', value)}>
                  <SelectTrigger id="custom-credit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="custom-section">Section</FieldLabel>
                <Input
                  id="custom-section"
                  required
                  value={form.COUR_CLS}
                  onChange={event => update('COUR_CLS', event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="custom-lang">Langue</FieldLabel>
                <Select value={form.ENG_YN} onValueChange={value => update('ENG_YN', value)}>
                  <SelectTrigger id="custom-lang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1">🇬🇧 Anglais</SelectItem>
                      <SelectItem value="0">🇰🇷 Coréen</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <FieldSet>
              <FieldLegend variant="label">Créneau horaire</FieldLegend>
              <FieldGroup>
                <div className="grid grid-cols-3 gap-3">
                  <Field>
                    <FieldLabel htmlFor="custom-day">Jour</FieldLabel>
                    <Select value={form.DAY} onValueChange={value => update('DAY', value)}>
                      <SelectTrigger id="custom-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {DAYS_SHORT.map(day => (
                            <SelectItem key={day} value={day}>
                              {DAYS_FR[day]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="custom-start">Début</FieldLabel>
                    <Select
                      value={form.START_PERIOD}
                      onValueChange={value => update('START_PERIOD', value)}
                    >
                      <SelectTrigger id="custom-start">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {Object.keys(PERIODS_MAP).map(period => (
                            <SelectItem key={period} value={period}>
                              P{period}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="custom-end">Fin</FieldLabel>
                    <Select
                      value={form.END_PERIOD}
                      onValueChange={value => update('END_PERIOD', value)}
                    >
                      <SelectTrigger id="custom-end">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {Object.keys(PERIODS_MAP).map(period => (
                            <SelectItem
                              key={period}
                              value={period}
                              disabled={Number(period) < Number(form.START_PERIOD)}
                            >
                              P{period}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="custom-room">Bâtiment - salle</FieldLabel>
                  <Input
                    id="custom-room"
                    required
                    value={form.ROOM}
                    onChange={event => update('ROOM', event.target.value)}
                    placeholder="ex : 35-322"
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="custom-prof">Enseignant</FieldLabel>
                <Input
                  id="custom-prof"
                  value={form.PROF_NM}
                  onChange={event => update('PROF_NM', event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="custom-dept">Département</FieldLabel>
                <Input
                  id="custom-dept"
                  value={form.DEPARTMENT}
                  onChange={event => update('DEPARTMENT', event.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="custom-course-form">
            Insérer au catalogue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
