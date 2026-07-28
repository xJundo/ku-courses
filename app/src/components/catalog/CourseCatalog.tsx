import { useEffect, useState } from 'react';
import { FilterIcon, SearchIcon, SlidersIcon, StarIcon } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CATEGORY_COLORS } from '@/constants/schedule';
import { cn } from '@/lib/utils';
import type { CommentThreads, ProcessedCourse, SortOption } from '@/types/course';
import { courseKey } from '@/utils/courseUtils';

/** How many cards to add to the grid per "show more" click. */
const PAGE_SIZE = 40;

const TABS: { value: string; label: string; category?: keyof typeof CATEGORY_COLORS }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'it', label: 'IT', category: 'IT' },
  { value: 'business', label: 'Business', category: 'BUSINESS' },
  { value: 'korean', label: 'Coréen', category: 'KOREAN' },
  { value: 'others', label: 'Autre', category: 'OTHERS' }
];

interface CourseCatalogProps {
  filteredCoursesList: ProcessedCourse[];
  selectedCourses: ProcessedCourse[];
  ratedCoursesCount: number;
  threads: CommentThreads;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  showClosedExchange: boolean;
  setShowClosedExchange: (show: boolean) => void;
  showOnlyEnglish: boolean;
  setShowOnlyEnglish: (show: boolean) => void;
  onToggleCourse: (course: ProcessedCourse) => void;
  onCycleCategory: (course: ProcessedCourse) => void;
  onSetRating: (course: ProcessedCourse, rating: number) => void;
  onOpenDetails: (course: ProcessedCourse) => void;
}

export function CourseCatalog({
  filteredCoursesList,
  selectedCourses,
  ratedCoursesCount,
  threads,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  showClosedExchange,
  setShowClosedExchange,
  showOnlyEnglish,
  setShowOnlyEnglish,
  onToggleCourse,
  onCycleCategory,
  onSetRating,
  onOpenDetails
}: CourseCatalogProps) {
  const selectedKeys = new Set(selectedCourses.map(courseKey));

  // The full catalog is ~1500 courses and a filter can still match hundreds.
  // Rendering them all makes every keystroke and theme change cost seconds, so
  // the grid grows on demand instead.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Any filter/sort change produces a new array identity — start over from the
  // top so the user never lands mid-way through a previous result set.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filteredCoursesList]);

  const visibleCourses = filteredCoursesList.slice(0, visibleCount);
  const remainingCount = filteredCoursesList.length - visibleCourses.length;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <SlidersIcon className="size-4" />
              Catalogue des cours ({filteredCoursesList.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Sélectionnez vos cours, notez-les et annotez-les.
            </CardDescription>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="flex-wrap">
              {TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.category && (
                    <span
                      className={cn('size-2 rounded-full', CATEGORY_COLORS[tab.category].accent)}
                      aria-hidden
                    />
                  )}
                  {tab.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="rated">
                <StarIcon />
                Notés ({ratedCoursesCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Code, mot-clé, département, professeur ou commentaire…"
            />
          </InputGroup>

          <Field orientation="horizontal" className="md:w-auto">
            <FieldLabel htmlFor="sort-by" className="text-muted-foreground shrink-0 text-xs">
              Trier par
            </FieldLabel>
            <Select value={sortBy} onValueChange={value => setSortBy(value as SortOption)}>
              <SelectTrigger id="sort-by" className="w-full md:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="default">Ordre d’origine</SelectItem>
                  <SelectItem value="rating-desc">Note (haute → basse)</SelectItem>
                  <SelectItem value="rating-asc">Note (basse → haute)</SelectItem>
                  <SelectItem value="level-asc">Niveau (1 → 4+)</SelectItem>
                  <SelectItem value="level-desc">Niveau (4+ → 1)</SelectItem>
                  <SelectItem value="code">Code de cours</SelectItem>
                  <SelectItem value="name">Nom du cours</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="show-closed"
              checked={showClosedExchange}
              onCheckedChange={setShowClosedExchange}
            />
            <Label htmlFor="show-closed" className="text-xs font-normal">
              Afficher les cours fermés aux étudiants en échange
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="only-english"
              checked={showOnlyEnglish}
              onCheckedChange={setShowOnlyEnglish}
            />
            <Label htmlFor="only-english" className="text-xs font-normal">
              Cours en anglais uniquement 🇬🇧
            </Label>
          </div>
        </div>

        {filteredCoursesList.length > 0 ? (
          // The scroll container must wrap the grid rather than be the grid:
          // a bounded-height grid collapses rows whose items are scroll
          // containers, which every Card is (`overflow-hidden`).
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-1 gap-4 pr-3 md:grid-cols-2">
              {visibleCourses.map(course => {
                const key = courseKey(course);
                return (
                  <CourseCard
                    key={key}
                    course={course}
                    isSelected={selectedKeys.has(key)}
                    discussionCount={threads[key]?.length ?? 0}
                    onToggle={onToggleCourse}
                    onCycleCategory={onCycleCategory}
                    onSetRating={onSetRating}
                    onOpenDetails={onOpenDetails}
                  />
                );
              })}
            </div>

            {remainingCount > 0 && (
              <div className="flex flex-col items-center gap-1.5 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
                >
                  Afficher {Math.min(remainingCount, PAGE_SIZE)} cours de plus
                </Button>
                <span className="text-muted-foreground text-[11px]">
                  {visibleCourses.length} sur {filteredCoursesList.length} affichés
                </span>
              </div>
            )}
          </ScrollArea>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilterIcon />
              </EmptyMedia>
              <EmptyTitle>Aucun cours trouvé</EmptyTitle>
              <EmptyDescription>
                Aucun cours ne correspond à ces critères. Élargissez la recherche ou désactivez un
                filtre.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
