-- TFIVE PRO security hardening.
-- Organization-scoped Storage, trainer-only student access, least privilege,
-- and non-exposed SECURITY DEFINER helpers. No application data is deleted.

-- Make the policy helper resolvable while rebuilding policies, including
-- when this migration is re-run after an earlier direct database application.
CREATE SCHEMA IF NOT EXISTS private;
DO $block$
BEGIN
  IF to_regprocedure('public.is_trainer(uuid)') IS NULL
     AND to_regprocedure('private.is_trainer(uuid)') IS NOT NULL THEN
    ALTER FUNCTION private.is_trainer(uuid) SET SCHEMA public;
  END IF;
  IF to_regprocedure('public.is_organization_member(uuid)') IS NULL
     AND to_regprocedure('private.is_organization_member(uuid)') IS NOT NULL THEN
    ALTER FUNCTION private.is_organization_member(uuid) SET SCHEMA public;
  END IF;
END
$block$;

-- 1) Storage: remove global-trainer and public-listing policies.
DROP POLICY IF EXISTS "Public read for organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read for student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Trainers manage assessment photos" ON storage.objects;
DROP POLICY IF EXISTS "Trainers manage organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Trainers manage student avatars" ON storage.objects;

DROP POLICY IF EXISTS "TFIVE read organization assessment photos" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE read organization student avatars" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers read organization assets" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers read own organization assets" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers delete organization assessment photos" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers delete organization student avatars" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers delete own organization assets" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers insert organization assessment photos" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers insert organization student avatars" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers insert own organization assets" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers update organization assessment photos" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers update organization student avatars" ON storage.objects;
DROP POLICY IF EXISTS "TFIVE trainers update own organization assets" ON storage.objects;

-- The first path segment must be the organization UUID and the caller must
-- be an active trainer of that exact organization.
CREATE POLICY "TFIVE read organization assessment photos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id='assessment-photos' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE read organization student avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id='student-avatars' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers read own organization assets" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id='organization-assets' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers insert organization assessment photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='assessment-photos' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers update organization assessment photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id='assessment-photos' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END)
WITH CHECK (bucket_id='assessment-photos' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers delete organization assessment photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='assessment-photos' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers insert organization student avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='student-avatars' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers update organization student avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id='student-avatars' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END)
WITH CHECK (bucket_id='student-avatars' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers delete organization student avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='student-avatars' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers insert own organization assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='organization-assets' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers update own organization assets" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id='organization-assets' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END)
WITH CHECK (bucket_id='organization-assets' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE POLICY "TFIVE trainers delete own organization assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='organization-assets' AND CASE
  WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN public.is_trainer(((storage.foldername(name))[1])::uuid) ELSE false END);

-- Disable every Data API path to the student portal table. The existing deny
-- policy remains; permissive student/trainer policies and grants are removed.
DROP POLICY IF EXISTS "Students can read own access record" ON public.student_access;
DROP POLICY IF EXISTS "Trainers can manage student access" ON public.student_access;
REVOKE ALL PRIVILEGES ON TABLE public.student_access FROM anon, authenticated;

-- Remove the legacy student plan-read path.
DROP POLICY IF EXISTS "Students can view their active plan info" ON public.active_plans;
DROP FUNCTION IF EXISTS public.is_current_user_plan_participant(uuid, uuid);

-- Student authorization helpers are intentionally deny-only and must not
-- execute with elevated privileges.
CREATE OR REPLACE FUNCTION public.is_authorized_student(org_id uuid, p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO 'public', 'pg_temp' AS $function$ SELECT false $function$;

CREATE OR REPLACE FUNCTION public.has_student_permission(p_student_id uuid, perm_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO 'public', 'pg_temp' AS $function$ SELECT false $function$;

GRANT EXECUTE ON FUNCTION public.is_authorized_student(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_student_permission(uuid, text) TO anon, authenticated, service_role;

-- The broad global-trainer helper is no longer used by any policy.
DO $block$
BEGIN
  IF to_regprocedure('public.is_any_trainer()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.is_any_trainer() FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END
$block$;

-- Move authorization helpers out of the exposed public schema. Existing RLS
-- policy dependencies retain their function OIDs.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

DO $block$
BEGIN
  IF to_regprocedure('public.is_trainer(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.is_trainer(uuid) SET SCHEMA private;
  END IF;
  IF to_regprocedure('public.is_organization_member(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.is_organization_member(uuid) SET SCHEMA private;
  END IF;
END
$block$;

GRANT EXECUTE ON FUNCTION private.is_trainer(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_organization_member(uuid) TO anon, authenticated, service_role;

-- Lock down internal seed staging tables if they exist in this environment.
DO $block$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['_seed_dict', '_seed_raw'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'TFIVE deny API access', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        'TFIVE deny API access', t
      );
    END IF;
  END LOOP;
END
$block$;
