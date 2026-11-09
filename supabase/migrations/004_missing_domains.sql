-- ==============================================================================
-- TFIVE PRO — ETAPA 3.2: MIGRAÇÃO DE DOMÍNIOS RESTANTES (004_missing_domains.sql)
-- Criação das 11 tabelas adicionais para cobertura de 100% dos 29 stores do IndexedDB
-- Multi-tenancy estrito, RLS ativo, integridade referencial e auditoria
-- ==============================================================================

-- 1. FOTOS DOS ALUNOS E AVALIAÇÕES (Metadados e referências a Storage)
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Frente', 'Lateral direita', 'Lateral esquerda', 'Costas', 'Outro')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  storage_path TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  is_base64_migrated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BANCO DE TESTES FUNCIONAIS
CREATE TABLE IF NOT EXISTS functional_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  domain TEXT NOT NULL CHECK (domain IN ('strength', 'mobility', 'balance', 'power', 'locomotion', 'endurance', 'autonomy')),
  autonomy_task TEXT CHECK (autonomy_task IN ('stand_up', 'walk', 'balance', 'carry', 'climb', 'squat', 'floor_rise')),
  category TEXT NOT NULL,
  description TEXT,
  equipment_needed JSONB DEFAULT '[]'::jsonb,
  unit TEXT NOT NULL CHECK (unit IN ('reps', 'seconds', 'minutes', 'meters', 'm/s', 'kg', 'levels', 'custom')),
  unit_label TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('higher_is_better', 'lower_is_better', 'categorical_levels')),
  instructions JSONB DEFAULT '[]'::jsonb,
  tips JSONB DEFAULT '[]'::jsonb,
  has_multiple_trials BOOLEAN DEFAULT FALSE,
  has_bilateral BOOLEAN DEFAULT FALSE,
  has_eyes_condition BOOLEAN DEFAULT FALSE,
  has_arm_support_option BOOLEAN DEFAULT FALSE,
  has_assistive_device_option BOOLEAN DEFAULT FALSE,
  has_step_height_option BOOLEAN DEFAULT FALSE,
  default_duration_seconds INTEGER,
  categorical_levels JSONB DEFAULT '[]'::jsonb,
  is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
  is_custom BOOLEAN NOT NULL DEFAULT TRUE,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. AVALIAÇÕES FUNCIONAIS REALIZADAS
CREATE TABLE IF NOT EXISTS functional_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT,
  battery_id UUID,
  battery_name TEXT,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  trainer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. METAS FUNCIONAIS DO ALUNO
CREATE TABLE IF NOT EXISTS functional_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('strength', 'mobility', 'balance', 'power', 'locomotion', 'endurance', 'autonomy')),
  autonomy_task TEXT CHECK (autonomy_task IN ('stand_up', 'walk', 'balance', 'carry', 'climb', 'squat', 'floor_rise')),
  test_id UUID,
  test_name TEXT,
  target_value_numeric NUMERIC(10,2),
  target_value_categorical TEXT,
  initial_value_numeric NUMERIC(10,2),
  initial_value_categorical TEXT,
  current_value_numeric NUMERIC(10,2),
  current_value_categorical TEXT,
  unit_label TEXT,
  direction TEXT CHECK (direction IN ('higher_is_better', 'lower_is_better', 'categorical_levels')),
  deadline_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 'cancelled')),
  achieved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MARCOS HISTÓRICOS FUNCIONAIS (MILESTONES)
CREATE TABLE IF NOT EXISTS functional_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('strength', 'mobility', 'balance', 'power', 'locomotion', 'endurance', 'autonomy')),
  test_id UUID,
  goal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BATERIAS PADRONIZADAS DE TESTES FUNCIONAIS
CREATE TABLE IF NOT EXISTS functional_batteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  test_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration_minutes INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. LAUDOS E RELATÓRIOS PERIÓDICOS DE EVOLUÇÃO
CREATE TABLE IF NOT EXISTS evolution_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_photo TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  title TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  primary_goal JSONB,
  secondary_goals JSONB DEFAULT '[]'::jsonb,
  period_status TEXT,
  trainer_profile JSONB,
  evolution_score JSONB,
  key_indicators JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  adherence JSONB,
  exercise_progressions JSONB DEFAULT '[]'::jsonb,
  performance_highlights JSONB DEFAULT '[]'::jsonb,
  physical_comparison JSONB,
  functional_comparison JSONB,
  daily_living_impact JSONB,
  timeline_events JSONB DEFAULT '[]'::jsonb,
  goals JSONB DEFAULT '[]'::jsonb,
  trainer_opinion JSONB,
  next_cycle_plan JSONB,
  data_sources JSONB DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. MODELOS / TEMPLATES DE TREINOS E ROTINAS
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  objective TEXT,
  level TEXT DEFAULT 'todos',
  tags JSONB DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN DEFAULT FALSE,
  category TEXT,
  workouts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. MODELOS DE PROPOSTAS COMERCIAIS
CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  service TEXT NOT NULL,
  description TEXT NOT NULL,
  default_description TEXT,
  plan_type TEXT DEFAULT 'individual',
  mode TEXT NOT NULL DEFAULT 'presencial',
  plans JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions TEXT NOT NULL,
  default_validity_days INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. JORNADA DE ONBOARDING DE NOVOS ALUNOS
CREATE TABLE IF NOT EXISTS student_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_welcome_message TEXT,
  welcome_message_snapshot JSONB,
  guide_snapshot JSONB,
  plan_name_override TEXT,
  frequency_override TEXT,
  start_date_override DATE,
  notes TEXT,
  source_proposal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. USUÁRIOS E CONTAS DE ACESSO DO APLICATIVO (Treinadores e Alunos)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auth_uid TEXT,
  role TEXT NOT NULL CHECK (role IN ('TRAINER', 'STUDENT')),
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'pending')),
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES DE DESEMPENHO E MULTI-TENANCY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_photos_org_student ON photos(organization_id, student_id);
CREATE INDEX IF NOT EXISTS idx_functional_tests_org ON functional_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_functional_assessments_org_student ON functional_assessments(organization_id, student_id);
CREATE INDEX IF NOT EXISTS idx_functional_goals_org_student ON functional_goals(organization_id, student_id);
CREATE INDEX IF NOT EXISTS idx_functional_milestones_org_student ON functional_milestones(organization_id, student_id);
CREATE INDEX IF NOT EXISTS idx_functional_batteries_org ON functional_batteries(organization_id);
CREATE INDEX IF NOT EXISTS idx_evolution_reports_org_student ON evolution_reports(organization_id, student_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_org ON workout_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_org ON proposal_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_onboardings_org_student ON student_onboardings(organization_id, student_id);
CREATE INDEX IF NOT EXISTS idx_app_users_org ON app_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_app_users_auth_uid ON app_users(auth_uid);

-- ==============================================================================
-- HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolution_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS RLS PARA TREINADORES (Acesso total à própria organização)
-- ==============================================================================
CREATE POLICY "Trainers manage photos" ON photos
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage functional_tests" ON functional_tests
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage functional_assessments" ON functional_assessments
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage functional_goals" ON functional_goals
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage functional_milestones" ON functional_milestones
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage functional_batteries" ON functional_batteries
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage evolution_reports" ON evolution_reports
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage workout_templates" ON workout_templates
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage proposal_templates" ON proposal_templates
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage student_onboardings" ON student_onboardings
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

CREATE POLICY "Trainers manage app_users" ON app_users
  FOR ALL USING (is_trainer(organization_id)) WITH CHECK (is_trainer(organization_id));

-- ==============================================================================
-- POLÍTICAS RLS PARA ALUNOS (Leitura restrita aos próprios dados)
-- ==============================================================================
CREATE POLICY "Students view own photos" ON photos
  FOR SELECT USING (is_authorized_student(organization_id, student_id));

CREATE POLICY "Students view functional_tests" ON functional_tests
  FOR SELECT USING (is_trainer(organization_id) OR EXISTS (
    SELECT 1 FROM student_access WHERE student_access.user_id = auth.uid() AND student_access.organization_id = functional_tests.organization_id
  ));

CREATE POLICY "Students view own functional_assessments" ON functional_assessments
  FOR SELECT USING (is_authorized_student(organization_id, student_id) AND has_student_permission(student_id, 'assessments'));

CREATE POLICY "Students view own functional_goals" ON functional_goals
  FOR SELECT USING (is_authorized_student(organization_id, student_id));

CREATE POLICY "Students view own functional_milestones" ON functional_milestones
  FOR SELECT USING (is_authorized_student(organization_id, student_id));

CREATE POLICY "Students view own evolution_reports" ON evolution_reports
  FOR SELECT USING (is_authorized_student(organization_id, student_id) AND has_student_permission(student_id, 'reports'));

CREATE POLICY "Students view own onboarding" ON student_onboardings
  FOR SELECT USING (is_authorized_student(organization_id, student_id));

CREATE POLICY "Users view own app_user profile" ON app_users
  FOR SELECT USING (auth_uid = auth.uid()::text);
