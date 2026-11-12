-- TFIVE PRO is a trainer-only application. Remove legacy student-facing
-- RLS paths and consolidate overlapping trainer policies.

DO $block$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND policyname <> 'Read exercises policy'
      AND (
        policyname ILIKE 'Students %'
        OR policyname ILIKE 'Authorized students %'
        OR coalesce(qual,'') ILIKE '%is_authorized_student%'
        OR coalesce(qual,'') ILIKE '%has_student_permission%'
        OR coalesce(qual,'') ILIKE '%student_access%'
        OR coalesce(with_check,'') ILIKE '%is_authorized_student%'
        OR coalesce(with_check,'') ILIKE '%has_student_permission%'
        OR coalesce(with_check,'') ILIKE '%student_access%'
      )
      AND NOT (tablename='student_access' AND policyname='Block all student access (disabled)')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END
$block$;

ALTER POLICY "Read exercises policy" ON public.exercises
TO authenticated
USING (organization_id IS NULL OR private.is_organization_member(organization_id));

DO $block$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND roles='{public}'
      AND NOT (tablename='student_access' AND policyname='Block all student access (disabled)')
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', p.policyname, p.tablename);
  END LOOP;
END
$block$;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

CREATE INDEX IF NOT EXISTS idx_student_photos_student_id
ON public.student_photos(student_id);

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND (coalesce(qual,'') ILIKE '%is_authorized_student%'
        OR coalesce(with_check,'') ILIKE '%is_authorized_student%')
  ) AND to_regprocedure('public.is_authorized_student(uuid,uuid)') IS NOT NULL THEN
    DROP FUNCTION public.is_authorized_student(uuid, uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND (coalesce(qual,'') ILIKE '%has_student_permission%'
        OR coalesce(with_check,'') ILIKE '%has_student_permission%')
  ) AND to_regprocedure('public.has_student_permission(uuid,text)') IS NOT NULL THEN
    DROP FUNCTION public.has_student_permission(uuid, text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE coalesce(qual,'') ILIKE '%is_any_trainer%'
       OR coalesce(with_check,'') ILIKE '%is_any_trainer%'
  ) AND to_regprocedure('public.is_any_trainer()') IS NOT NULL THEN
    DROP FUNCTION public.is_any_trainer();
  END IF;
END
$block$;

-- Avoid duplicate permissive SELECT paths for trainer-owned profile rows.
DROP POLICY IF EXISTS "Users view own app_user profile" ON public.app_users;
DROP POLICY IF EXISTS "Members can view peers in same organization" ON public.organization_members;

-- Exercise reads are handled by the organization-member policy. Keep write
-- operations trainer-only and separate by command.
DROP POLICY IF EXISTS "Trainers can create or update custom exercises" ON public.exercises;
DROP POLICY IF EXISTS "Trainers insert custom exercises" ON public.exercises;
DROP POLICY IF EXISTS "Trainers update custom exercises" ON public.exercises;
DROP POLICY IF EXISTS "Trainers delete custom exercises" ON public.exercises;

CREATE POLICY "Trainers insert custom exercises" ON public.exercises
FOR INSERT TO authenticated
WITH CHECK (organization_id IS NOT NULL AND private.is_trainer(organization_id));

CREATE POLICY "Trainers update custom exercises" ON public.exercises
FOR UPDATE TO authenticated
USING (organization_id IS NOT NULL AND private.is_trainer(organization_id))
WITH CHECK (organization_id IS NOT NULL AND private.is_trainer(organization_id));

CREATE POLICY "Trainers delete custom exercises" ON public.exercises
FOR DELETE TO authenticated
USING (organization_id IS NOT NULL AND private.is_trainer(organization_id));

ALTER POLICY "Users can read own profile" ON public.profiles
USING (id = (SELECT auth.uid()));

ALTER POLICY "Users can update own profile" ON public.profiles
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));
