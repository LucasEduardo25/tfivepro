-- ==============================================================================
-- TFIVE PRO — ETAPA 1: MIGRAÇÃO FIREBASE -> SUPABASE / POSTGRESQL
-- MIGRATION 002: ROW LEVEL SECURITY (RLS) POLICIES & SECURITY FUNCTIONS
-- ==============================================================================

-- ==============================================================================
-- 1. SECURITY HELPER FUNCTIONS (EXECUTES IN POSTGRES WITH SECURITY DEFINER)
-- ==============================================================================

-- Retorna o ID do usuário atualmente autenticado no Supabase Auth
CREATE OR REPLACE FUNCTION current_auth_uid()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- Verifica se o usuário atual é membro ativo de uma organização específica
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
      AND user_id = auth.uid() 
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifica se o usuário atual é um Personal Trainer ativo na organização
CREATE OR REPLACE FUNCTION is_trainer(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
      AND user_id = auth.uid() 
      AND role IN ('OWNER', 'TRAINER')
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifica se o usuário atual é o aluno autorizado especificamente vinculado àquele student_id
-- REGRA DE OURO: Derivado diretamente do token auth.uid() e do vínculo em student_access,
-- NUNCA confiando em parâmetros livres passados pelo cliente.
CREATE OR REPLACE FUNCTION is_authorized_student(org_id UUID, p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM student_access sa
    WHERE sa.student_id = p_student_id
      AND sa.organization_id = org_id
      AND sa.user_id = auth.uid()
      AND sa.enabled = true
      AND sa.status = 'ACTIVE'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifica se o aluno possui uma permissão granular específica ativada pelo Personal
CREATE OR REPLACE FUNCTION has_student_permission(p_student_id UUID, perm_key TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (permissions->>perm_key)::boolean,
    false
  )
  FROM student_access
  WHERE student_id = p_student_id
    AND user_id = auth.uid()
    AND enabled = true
    AND status = 'ACTIVE';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 2. ENABLE RLS ON ALL TABLES
-- ==============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. RLS POLICIES: PROFILES & ORGANIZATIONS
-- ==============================================================================

-- Profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Organization Members
CREATE POLICY "Members can view peers in same organization"
  ON organization_members FOR SELECT
  USING (is_organization_member(organization_id));

CREATE POLICY "Trainers can manage members in organization"
  ON organization_members FOR ALL
  USING (is_trainer(organization_id));

-- Organizations
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (is_organization_member(id));

CREATE POLICY "Trainers can update their organization"
  ON organizations FOR UPDATE
  USING (is_trainer(id));

-- ==============================================================================
-- 4. RLS POLICIES: STUDENTS & STUDENT_ACCESS
-- ==============================================================================

-- Students
CREATE POLICY "Trainers can manage students in their organization"
  ON students FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Authorized students can read own student record"
  ON students FOR SELECT
  USING (is_authorized_student(organization_id, id));

-- Student Access
CREATE POLICY "Trainers can manage student access"
  ON student_access FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Students can read own access record"
  ON student_access FOR SELECT
  USING (user_id = auth.uid() AND enabled = true);

-- ==============================================================================
-- 5. RLS POLICIES: EXERCISES
-- ==============================================================================

-- Exercícios globais (organization_id IS NULL) são visíveis para todos os autenticados.
-- Exercícios customizados são visíveis apenas para membros da mesma organização.
CREATE POLICY "Read exercises policy"
  ON exercises FOR SELECT
  USING (
    organization_id IS NULL 
    OR is_organization_member(organization_id)
    OR EXISTS (
      SELECT 1 FROM student_access sa
      WHERE sa.organization_id = exercises.organization_id
        AND sa.user_id = auth.uid()
        AND sa.enabled = true
        AND sa.status = 'ACTIVE'
    )
  );

CREATE POLICY "Trainers can create or update custom exercises"
  ON exercises FOR ALL
  USING (organization_id IS NOT NULL AND is_trainer(organization_id))
  WITH CHECK (organization_id IS NOT NULL AND is_trainer(organization_id));

-- ==============================================================================
-- 6. RLS POLICIES: ROUTINES & WORKOUTS
-- ==============================================================================

-- Routines
CREATE POLICY "Trainers can manage routines"
  ON routines FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Authorized students can view own active routines"
  ON routines FOR SELECT
  USING (
    is_authorized_student(organization_id, student_id)
    AND has_student_permission(student_id, 'currentWorkout')
  );

-- Routine Workouts
CREATE POLICY "Trainers can manage routine workouts"
  ON routine_workouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM routines r 
      WHERE r.id = routine_workouts.routine_id 
        AND is_trainer(r.organization_id)
    )
  );

CREATE POLICY "Students can view workouts of their routine"
  ON routine_workouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routines r 
      WHERE r.id = routine_workouts.routine_id 
        AND is_authorized_student(r.organization_id, r.student_id)
        AND has_student_permission(r.student_id, 'currentWorkout')
    )
  );

-- Exercise Groups & Workout Exercises
CREATE POLICY "Trainers can manage exercise groups"
  ON exercise_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM routine_workouts rw
      JOIN routines r ON r.id = rw.routine_id
      WHERE rw.id = exercise_groups.workout_id
        AND is_trainer(r.organization_id)
    )
  );

CREATE POLICY "Students can view exercise groups of their routine"
  ON exercise_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routine_workouts rw
      JOIN routines r ON r.id = rw.routine_id
      WHERE rw.id = exercise_groups.workout_id
        AND is_authorized_student(r.organization_id, r.student_id)
        AND has_student_permission(r.student_id, 'currentWorkout')
    )
  );

CREATE POLICY "Trainers can manage workout exercises"
  ON workout_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM routine_workouts rw
      JOIN routines r ON r.id = rw.routine_id
      WHERE rw.id = workout_exercises.workout_id
        AND is_trainer(r.organization_id)
    )
  );

CREATE POLICY "Students can view workout exercises of their routine"
  ON workout_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routine_workouts rw
      JOIN routines r ON r.id = rw.routine_id
      WHERE rw.id = workout_exercises.workout_id
        AND is_authorized_student(r.organization_id, r.student_id)
        AND has_student_permission(r.student_id, 'currentWorkout')
    )
  );

-- ==============================================================================
-- 7. RLS POLICIES: SESSIONS, EXERCISES & SETS
-- ==============================================================================

-- Sessions
CREATE POLICY "Trainers can manage sessions"
  ON sessions FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Authorized students can view own workout sessions"
  ON sessions FOR SELECT
  USING (
    is_authorized_student(organization_id, student_id)
    AND (has_student_permission(student_id, 'workoutHistory') OR status = 'in_progress')
  );

-- Session Exercises & Sets
CREATE POLICY "Trainers can manage session exercises"
  ON session_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_exercises.session_id 
        AND is_trainer(s.organization_id)
    )
  );

CREATE POLICY "Students can view session exercises of own sessions"
  ON session_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_exercises.session_id 
        AND is_authorized_student(s.organization_id, s.student_id)
        AND has_student_permission(s.student_id, 'workoutHistory')
    )
  );

CREATE POLICY "Trainers can manage session sets"
  ON session_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_sets.session_id 
        AND is_trainer(s.organization_id)
    )
  );

CREATE POLICY "Students can view session sets of own sessions"
  ON session_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_sets.session_id 
        AND is_authorized_student(s.organization_id, s.student_id)
        AND has_student_permission(s.student_id, 'workoutHistory')
    )
  );

-- Personal Records
CREATE POLICY "Trainers can manage personal records"
  ON personal_records FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Students can view own PRs"
  ON personal_records FOR SELECT
  USING (
    is_authorized_student(organization_id, student_id)
    AND has_student_permission(student_id, 'workoutHistory')
  );

-- Active Workouts
CREATE POLICY "Trainers can manage active workouts"
  ON active_workouts FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Students can view own active workout"
  ON active_workouts FOR SELECT
  USING (is_authorized_student(organization_id, student_id));

-- ==============================================================================
-- 8. RLS POLICIES: ASSESSMENTS
-- ==============================================================================

CREATE POLICY "Trainers can manage assessments"
  ON assessments FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Authorized students can view own assessments"
  ON assessments FOR SELECT
  USING (
    is_authorized_student(organization_id, student_id)
    AND has_student_permission(student_id, 'assessments')
  );

-- ==============================================================================
-- 9. RLS POLICIES: SCHEDULE & RECURRENCES
-- ==============================================================================

CREATE POLICY "Trainers can manage schedule recurrences"
  ON schedule_recurrences FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Students can view own schedule recurrences"
  ON schedule_recurrences FOR SELECT
  USING (
    is_authorized_student(organization_id, student_id)
    AND has_student_permission(student_id, 'schedule')
  );

CREATE POLICY "Trainers can manage schedule events"
  ON schedule_events FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Students can view own schedule events"
  ON schedule_events FOR SELECT
  USING (
    is_authorized_student(organization_id, student_id)
    AND has_student_permission(student_id, 'schedule')
  );

-- ==============================================================================
-- 10. RLS POLICIES: TRAINING CYCLES & BLOCKS
-- ==============================================================================

CREATE POLICY "Trainers can manage training cycles"
  ON training_cycles FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Students can view own training cycles"
  ON training_cycles FOR SELECT
  USING (
    is_authorized_student(organization_id, student_id)
    AND has_student_permission(student_id, 'currentCycle')
  );

CREATE POLICY "Trainers can manage training blocks"
  ON training_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM training_cycles tc 
      WHERE tc.id = training_blocks.cycle_id 
        AND is_trainer(tc.organization_id)
    )
  );

CREATE POLICY "Students can view training blocks of own cycles"
  ON training_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_cycles tc 
      WHERE tc.id = training_blocks.cycle_id 
        AND is_authorized_student(tc.organization_id, tc.student_id)
        AND has_student_permission(tc.student_id, 'currentCycle')
    )
  );

-- ==============================================================================
-- 11. RLS POLICIES: TRAINING MEMORIES (EXCLUSIVO DO PERSONAL TRAINER)
-- ==============================================================================

-- Lembretes técnicos do treinador são privados e operacionais.
-- Alunos não têm acesso a training_memories.
CREATE POLICY "Trainers can manage training memories"
  ON training_memories FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

-- ==============================================================================
-- 12. RLS POLICIES: PROPOSALS & ACTIVE PLANS
-- ==============================================================================

CREATE POLICY "Trainers can manage proposals"
  ON proposals FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers can manage active plans"
  ON active_plans FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Students can view their active plan info"
  ON active_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plan_participants pp 
      WHERE pp.active_plan_id = active_plans.id 
        AND pp.student_id IS NOT NULL 
        AND is_authorized_student(active_plans.organization_id, pp.student_id)
    )
  );

CREATE POLICY "Trainers can manage plan participants"
  ON plan_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM active_plans ap 
      WHERE ap.id = plan_participants.active_plan_id 
        AND is_trainer(ap.organization_id)
    )
  );

CREATE POLICY "Trainers can manage plan suspensions"
  ON plan_suspensions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM active_plans ap 
      WHERE ap.id = plan_suspensions.active_plan_id 
        AND is_trainer(ap.organization_id)
    )
  );

CREATE POLICY "Trainers can manage plan transfers"
  ON plan_transfers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM active_plans ap 
      WHERE ap.id = plan_transfers.active_plan_id 
        AND is_trainer(ap.organization_id)
    )
  );

CREATE POLICY "Trainers can view plan audit logs"
  ON plan_audit_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM active_plans ap 
      WHERE ap.id = plan_audit_logs.active_plan_id 
        AND is_trainer(ap.organization_id)
    )
  );

-- ==============================================================================
-- 13. RLS POLICIES: SETTINGS & SYNC METADATA (EXCLUSIVO DO TRAINER)
-- ==============================================================================

CREATE POLICY "Trainers can manage settings"
  ON settings FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers can manage sync metadata"
  ON sync_metadata FOR ALL
  USING (is_trainer(organization_id))
  WITH CHECK (is_trainer(organization_id));
