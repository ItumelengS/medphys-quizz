/**
 * Apply discipline-based filtering to a Supabase query.
 * - Physicists see ALL questions (no filter).
 * - Others see questions tagged with their discipline OR 'general'.
 */
export function applyDisciplineFilter<T>(query: T, discipline: string): T {
  if (discipline === "physicist") return query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query as any).overlaps("disciplines", [discipline, "general"]);
}
