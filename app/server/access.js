/**
 * SQL predicate deciding whether a calendar row is readable by the viewer.
 *
 * `param` must be a placeholder holding the viewer id (or NULL for anonymous
 * visitors); it is cast to uuid so a plain `null` parameter type-checks.
 * Calendars imported before accounts existed have no owner and stay public.
 */
export function calendarVisibleTo(alias, param) {
  return `(
    ${alias}.visibility = 'public'
    OR ${alias}.owner_id = ${param}::uuid
    OR EXISTS (
      SELECT 1 FROM calendar_shares cs
       WHERE cs.calendar_id = ${alias}.id AND cs.user_id = ${param}::uuid
    )
  )`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}
