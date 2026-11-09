/**
 * Search, Normalization & Filtering Utilities
 * TFIVE PRO - Global Search & Filter Engine
 */

/**
 * Normalizes a string by removing diacritics/accents, converting to lowercase and trimming extra spaces.
 * Example: "Agachamento com Halter — Pé" -> "agachamento com halter pe"
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Checks if targetText contains query tokens (accent-insensitive, case-insensitive).
 * Supports multi-word queries: every token in query must match anywhere in the target.
 */
export function searchMatches(targetText: string | null | undefined, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!targetText) return false;

  const normalizedTarget = normalizeSearchText(targetText);
  const normalizedQuery = normalizeSearchText(query);

  const tokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return true;

  return tokens.every(token => normalizedTarget.includes(token));
}

/**
 * Checks if any of the target fields match the query tokens.
 */
export function searchInFields(fields: (string | null | undefined)[], query: string): boolean {
  if (!query || !query.trim()) return true;
  const combined = fields.filter(Boolean).join(' ');
  return searchMatches(combined, query);
}

/**
 * Sort options enum and generic sort helper
 */
export type GenericSortOption = 
  | 'name_asc' 
  | 'name_desc' 
  | 'date_desc' 
  | 'date_asc' 
  | 'recent' 
  | 'muscle'
  | 'usage';

export interface SortOptionItem {
  value: string;
  label: string;
}
