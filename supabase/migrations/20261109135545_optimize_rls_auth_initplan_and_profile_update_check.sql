-- Optimize auth.uid() evaluation in RLS policies and enforce profile ownership on UPDATE.
-- Applied to the linked Supabase project as migration 20261109135545.

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students can read own access record" ON public.student_access;
CREATE POLICY "Students can read own access record" ON public.student_access
  FOR SELECT USING (user_id = (SELECT auth.uid()) AND enabled = true);

DROP POLICY IF EXISTS "Read exercises policy" ON public.exercises;
CREATE POLICY "Read exercises policy" ON public.exercises
  FOR SELECT USING (
    organization_id IS NULL
    OR is_organization_member(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.student_access sa
      WHERE sa.organization_id = exercises.organization_id
        AND sa.user_id = (SELECT auth.uid())
        AND sa.enabled = true
        AND sa.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Students view functional_tests" ON public.functional_tests;
CREATE POLICY "Students view functional_tests" ON public.functional_tests
  FOR SELECT USING (
    is_trainer(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.student_access
      WHERE student_access.user_id = (SELECT auth.uid())
        AND student_access.organization_id = functional_tests.organization_id
    )
  );

DROP POLICY IF EXISTS "Users view own app_user profile" ON public.app_users;
CREATE POLICY "Users view own app_user profile" ON public.app_users
  FOR SELECT USING (auth_uid = (SELECT auth.uid())::text);
