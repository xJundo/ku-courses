import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, StarIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DAYS_FR } from '@/constants/schedule';
import { cn } from '@/lib/utils';
import type { SelectedStats, ValidationDetails } from '@/types/course';
import { courseKey } from '@/utils/courseUtils';

interface ValidationRowProps {
  met: boolean;
  title: string;
  description: string;
}

function ValidationRow({ met, title, description }: ValidationRowProps) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-0.5 rounded-md p-1',
          met ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
        )}
      >
        {met ? <CheckCircleIcon className="size-4" /> : <AlertTriangleIcon className="size-4" />}
      </span>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}

interface ValidationPanelProps {
  loadingCatalog: boolean;
  jsonError: string | null;
  catalogSource: string;
  ratedCoursesCount: number;
  selectedStats: SelectedStats;
  validationDetails: ValidationDetails;
}

export function ValidationPanel({
  loadingCatalog,
  jsonError,
  catalogSource,
  ratedCoursesCount,
  selectedStats,
  validationDetails
}: ValidationPanelProps) {
  return (
    <div className="flex flex-col gap-4 lg:col-span-4">
      {loadingCatalog && (
        <Card size="sm">
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      )}

      {jsonError && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Problème de chargement</AlertTitle>
          <AlertDescription>{jsonError}</AlertDescription>
        </Alert>
      )}

      <Card size="sm">
        <CardContent className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
          <span>
            Source : <span className="text-foreground font-medium">{catalogSource}</span>
          </span>
          <Badge variant="outline" className="gap-1">
            <StarIcon className="fill-warning text-warning" />
            {ratedCoursesCount} noté(s)
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            Validation de l’inscription
            <span
              className={cn(
                'size-2.5 rounded-full',
                validationDetails.isValidOverall ? 'bg-success' : 'bg-warning'
              )}
              aria-label={validationDetails.isValidOverall ? 'Valide' : 'Incomplet'}
            />
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <ValidationRow
            met={validationDetails.creditsMet}
            title={`Crédits locaux (${selectedStats.totalCredits} / 15)`}
            description="Minimum 15 crédits par semestre."
          />
          <ValidationRow
            met={validationDetails.daysMet}
            title={`Jours de présence (${selectedStats.activeDays.size} / 4)`}
            description={`Jours réservés : ${
              [...selectedStats.activeDays].map(day => DAYS_FR[day] || day).join(', ') || 'aucun'
            } (les cours MOOC/NEMO ne comptent pas)`}
          />
          <ValidationRow
            met={validationDetails.ruleMet}
            title="3 IT + 1 Business + 1 Coréen"
            description={`Actuel : ${selectedStats.itCount} IT · ${selectedStats.businessCount} Business · ${selectedStats.koreanCount} Coréen${
              selectedStats.othersCount > 0 ? ` · ${selectedStats.othersCount} Autre` : ''
            }`}
          />

          {selectedStats.hasConflict && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Conflit détecté</AlertTitle>
              <AlertDescription>Deux cours sélectionnés se chevauchent.</AlertDescription>
            </Alert>
          )}

          {selectedStats.nonExchangeCourses.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Cours fermés aux étudiants en échange</AlertTitle>
              <AlertDescription>
                <p>
                  Sur sugang.korea.ac.kr, ces cours n’ont pas la case « 3) X : Exchange Student »
                  cochée — l’inscription y sera probablement impossible :
                </p>
                <ul className="list-inside list-disc">
                  {selectedStats.nonExchangeCourses.map(course => (
                    <li key={courseKey(course)}>
                      <span className="font-mono font-semibold">{courseKey(course)}</span> —{' '}
                      {course.COUR_NM}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {selectedStats.limitedSeatsCourses.length > 0 && (
            <Alert>
              <AlertTriangleIcon />
              <AlertTitle>Places limitées</AlertTitle>
              <AlertDescription>
                {selectedStats.limitedSeatsCourses.length} cours sélectionné(s) ont un nombre de
                places restreint (colonne « 2) L »).
              </AlertDescription>
            </Alert>
          )}

          <div
            className={cn(
              'rounded-lg border p-4 text-center',
              validationDetails.isValidOverall
                ? 'border-success/30 bg-success/10 text-success'
                : 'bg-muted/50 text-muted-foreground'
            )}
          >
            {validationDetails.isValidOverall ? (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Emploi du temps éligible</span>
                <span className="text-xs">
                  15 crédits mini, ≤ 4 jours, 3 IT + 1 Business + 1 Coréen, sans conflit.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">En attente de validation</span>
                <span className="text-xs">Ajustez votre sélection pour respecter les critères.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs uppercase">
            <InfoIcon className="size-4" />
            Informations complémentaires
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground flex flex-col gap-2 text-xs">
          <p>
            <strong className="text-foreground">Catégorie</strong> auto-détectée par département.
            Cliquez sur le badge de catégorie d’une carte pour la corriger.
          </p>
          <p>
            <strong className="text-foreground">Difficulté</strong> déduite du 1<sup>er</sup> chiffre
            du numéro de cours (2xx = niveau 2, 3xx = niveau 3…).
          </p>
          <p>
            <strong className="text-foreground">Visio (MOOC/NEMO)</strong> : ces cours ne comptent pas
            dans la limite de jours.
          </p>
          <p>
            <strong className="text-foreground">Salles</strong> : le code indique d’abord le bâtiment
            puis la salle (ex : 35-322).
          </p>
          <p>
            <strong className="text-foreground">Discussions</strong> : ouvrez un calendrier
            communautaire puis un cours pour échanger avec son auteur et les autres étudiants.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
