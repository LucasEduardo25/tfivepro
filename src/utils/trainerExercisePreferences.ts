const FAVORITES_STORAGE_KEY = 'tfive_trainer_favorite_exercises';
const RECENTS_STORAGE_KEY = 'tfive_trainer_recent_exercises';
const MAX_RECENTS = 25;

/**
 * Retrieves the list of favorite exercise IDs from localStorage
 */
export function getFavoriteExerciseIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Toggles a favorite exercise ID and returns updated list
 */
export function toggleFavoriteExercise(exerciseId: string): string[] {
  try {
    const current = getFavoriteExerciseIds();
    const index = current.indexOf(exerciseId);
    let updated: string[];
    if (index > -1) {
      updated = current.filter(id => id !== exerciseId);
    } else {
      updated = [...current, exerciseId];
    }
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Checks if an exercise ID is in favorites
 */
export function isExerciseFavorite(exerciseId: string, favoritesList?: string[]): boolean {
  const list = favoritesList || getFavoriteExerciseIds();
  return list.includes(exerciseId);
}

/**
 * Retrieves recent exercise IDs
 */
export function getRecentExerciseIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Records an exercise ID in recents (bumping to top and capping size)
 */
export function recordRecentExercise(exerciseId: string): string[] {
  try {
    const current = getRecentExerciseIds();
    const filtered = current.filter(id => id !== exerciseId);
    const updated = [exerciseId, ...filtered].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
