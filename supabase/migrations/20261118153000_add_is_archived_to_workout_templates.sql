-- Keep the workout_templates schema aligned with SupabaseWorkoutTemplateRepository.
-- The repository reads, inserts, and updates this field.
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
