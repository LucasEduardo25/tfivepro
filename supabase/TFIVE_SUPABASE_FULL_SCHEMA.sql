-- ==============================================================================
-- TFIVE PRO — SCRIPT SQL UNIFICADO PARA SUPABASE REAL
-- ARQUIVO: /supabase/TFIVE_SUPABASE_FULL_SCHEMA.sql
--
-- CONSOLIDAÇÃO OFICIAL DAS MIGRATIONS 001 A 006 (SEM DADOS FICTÍCIOS / SEM SECRETS)
-- ORDEM DE DEPENDÊNCIAS:
--   1. 001_initial_schema.sql                  (DDL Relacional Base - 29 tabelas)
--   2. 002_rls.sql                             (Funções de Segurança + 50 Policies RLS)
--   3. 003_indexes.sql                         (46 Índices Estratégicos de Performance)
--   4. 004_missing_domains.sql                 (11 Tabelas Adicionais + 12 Índices + 19 Policies RLS)
--   5. 005_storage_buckets.sql                 (3 Buckets Oficiais + 8 Policies Storage)
--   6. 006_relax_student_gender_constraint.sql (Relaxamento da Constraint de Gender em Students)
-- ==============================================================================


-- ==============================================================================
-- SEÇÃO: 001_initial_schema.sql
-- ==============================================================================

-- ==============================================================================
-- TFIVE PRO — ETAPA 1: MIGRAÇÃO FIREBASE -> SUPABASE / POSTGRESQL
-- MIGRATION 001: INITIAL SCHEMA (MULTI-TENANT RELATIONAL DDL)
-- ==============================================================================

-- Habilita extensão pgcrypto / uuid-ossp para geração de UUIDv4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ORGANIZATIONS & AUTH PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles espelham os usuários autenticados em auth.users do Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- referencia auth.users(id)
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vínculo multi-tenant de usuários às organizações com papéis explícitos
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'TRAINER', 'STUDENT')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- ==============================================================================
-- 2. STUDENTS & ACCESS CONTROL (MODO ALUNO)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE, -- Mapeamento seguro para IDs originados no Firebase/IndexedDB
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    photo_url TEXT,
    phone TEXT,
    email TEXT,
    goal TEXT,
    notes TEXT, -- Nota privada do treinador
    student_visible_notes TEXT, -- Nota visível ao aluno
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    birth_date DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    plan_name TEXT,
    price_monthly NUMERIC(10, 2),
    start_date DATE,
    emergency_contact TEXT,
    tags TEXT[] DEFAULT '{}',
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Controle de liberação e permissões granulares para o Modo Aluno
CREATE TABLE IF NOT EXISTS student_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'NOT_ENABLED' CHECK (status IN ('NOT_ENABLED', 'INVITED', 'ACTIVE', 'DISABLED')),
    permissions JSONB NOT NULL DEFAULT '{"currentWorkout":true,"workoutHistory":true,"assessments":true,"reports":true,"schedule":true,"currentCycle":true}'::jsonb,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id)
);

-- ==============================================================================
-- 3. EXERCISES & LIBRARIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- NULL indica exercício global do sistema TFIVE
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    primary_muscles TEXT[] DEFAULT '{}',
    secondary_muscles TEXT[] DEFAULT '{}',
    equipment TEXT,
    execution_steps TEXT[] DEFAULT '{}',
    tips TEXT[] DEFAULT '{}',
    prescription_type TEXT NOT NULL DEFAULT 'weight_reps',
    record_type TEXT,
    is_custom BOOLEAN NOT NULL DEFAULT false,
    is_system BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    video_url TEXT,
    image_url TEXT,
    default_rest_seconds INTEGER NOT NULL DEFAULT 60,
    functional_tags TEXT[] DEFAULT '{}',
    animation_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. ROUTINES, WORKOUTS (A/B/C/D...) & PRESCRIBED EXERCISES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    objective TEXT,
    description TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    letter TEXT NOT NULL, -- 'A', 'B', 'C', 'D', 'E', 'F', etc.
    name TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(routine_id, letter)
);

CREATE TABLE IF NOT EXISTS exercise_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES routine_workouts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('normal', 'bi_set', 'tri_set', 'circuit')),
    name TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    rounds INTEGER NOT NULL DEFAULT 1,
    rest_between_exercises INTEGER DEFAULT 0,
    rest_after_round INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    workout_id UUID NOT NULL REFERENCES routine_workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    group_id UUID REFERENCES exercise_groups(id) ON DELETE SET NULL,
    position INTEGER NOT NULL DEFAULT 0,
    prescription_type TEXT NOT NULL DEFAULT 'weight_reps',
    target_sets INTEGER NOT NULL DEFAULT 3,
    target_reps_min INTEGER NOT NULL DEFAULT 8,
    target_reps_max INTEGER NOT NULL DEFAULT 12,
    target_duration_seconds INTEGER,
    duration_unit TEXT DEFAULT 'seconds',
    target_distance NUMERIC(10, 2),
    distance_unit TEXT DEFAULT 'meters',
    cardio_speed_kmh NUMERIC(5, 2),
    cardio_incline_pct NUMERIC(5, 2),
    target_rpe NUMERIC(3, 1),
    rest_seconds INTEGER NOT NULL DEFAULT 60,
    notes TEXT,
    last_suggested_load NUMERIC(8, 2),
    animation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. SESSIONS, EXECUTED EXERCISES & COMPLETED SETS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
    workout_id UUID REFERENCES routine_workouts(id) ON DELETE SET NULL,
    cycle_id UUID,
    block_id UUID,
    student_name_snapshot TEXT NOT NULL,
    routine_title_snapshot TEXT NOT NULL,
    workout_letter_snapshot TEXT,
    workout_name_snapshot TEXT,
    cycle_name_snapshot TEXT,
    block_name_snapshot TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    total_volume NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_sets INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    coach_notes TEXT,
    student_rating INTEGER,
    routine_snapshot JSONB,
    workout_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    exercise_name_snapshot TEXT NOT NULL,
    muscle_group_snapshot TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    prescription_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    session_exercise_id UUID REFERENCES session_exercises(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    set_number INTEGER NOT NULL,
    target_reps INTEGER,
    actual_reps INTEGER,
    weight_kg NUMERIC(8, 2),
    target_duration_seconds INTEGER,
    actual_duration_seconds INTEGER,
    target_distance NUMERIC(10, 2),
    actual_distance NUMERIC(10, 2),
    speed_kmh NUMERIC(5, 2),
    incline_pct NUMERIC(5, 2),
    rpe NUMERIC(3, 1),
    is_pr BOOLEAN NOT NULL DEFAULT false,
    pr_types TEXT[] DEFAULT '{}',
    is_warmup BOOLEAN NOT NULL DEFAULT false,
    is_drop_set BOOLEAN NOT NULL DEFAULT false,
    rest_seconds_used INTEGER,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'skipped', 'pending')),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    exercise_name_snapshot TEXT NOT NULL,
    muscle_group_snapshot TEXT,
    pr_type TEXT NOT NULL,
    metric_label TEXT NOT NULL,
    previous_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    new_value NUMERIC(10, 2) NOT NULL,
    reps INTEGER,
    weight_kg NUMERIC(8, 2),
    duration_seconds INTEGER,
    distance_meters NUMERIC(10, 2),
    estimated_1rm NUMERIC(8, 2),
    achieved_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessões ativas simultâneas (Multi-atendimento)
CREATE TABLE IF NOT EXISTS active_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
    workout_id UUID REFERENCES routine_workouts(id) ON DELETE SET NULL,
    state_snapshot JSONB NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. PHYSICAL ASSESSMENTS & HISTORICAL DATA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    weight_kg NUMERIC(6, 2) NOT NULL,
    height_cm NUMERIC(6, 2) NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    protocol TEXT NOT NULL,
    source TEXT DEFAULT 'manual_tfive',
    body_fat_percentage NUMERIC(5, 2) NOT NULL,
    fat_mass_kg NUMERIC(6, 2) NOT NULL,
    lean_mass_kg NUMERIC(6, 2) NOT NULL,
    lean_mass_percentage NUMERIC(5, 2),
    bmi NUMERIC(5, 2) NOT NULL,
    waist_hip_ratio NUMERIC(5, 2),
    formula_used TEXT,
    body_density NUMERIC(8, 5),
    sum_of_skinfolds NUMERIC(6, 2),
    skinfolds JSONB,
    circumferences JSONB,
    photos JSONB,
    original_image_url TEXT,
    provenance JSONB,
    notes TEXT,
    conclusions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. SCHEDULE & RECURRENCES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS schedule_recurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE,
    period_type TEXT NOT NULL,
    weekdays INTEGER[] NOT NULL,
    default_time TIME NOT NULL,
    default_duration_minutes INTEGER NOT NULL DEFAULT 60,
    default_routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
    default_workout_id UUID REFERENCES routine_workouts(id) ON DELETE SET NULL,
    weekday_configs JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    paused_from DATE,
    paused_until DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    recurrence_id UUID REFERENCES schedule_recurrences(id) ON DELETE SET NULL,
    routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
    workout_id UUID REFERENCES routine_workouts(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    type TEXT NOT NULL DEFAULT 'workout',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),
    notes TEXT,
    is_exception BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. PERIODIZATION: TRAINING CYCLES & BLOCKS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS training_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    objective TEXT,
    start_date DATE NOT NULL,
    total_weeks INTEGER NOT NULL DEFAULT 12,
    review_date DATE,
    actual_end_date DATE,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'current', 'completed', 'archived')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    cycle_id UUID NOT NULL REFERENCES training_cycles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    objective TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
    routine_title_snapshot TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    routine_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. TRAINING MEMORY (CENTRAL HOJE / LEMBRETES OPERACIONAIS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS training_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
    source_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    exercise_name_snapshot TEXT,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- ==============================================================================
-- 10. COMMERCIAL PROPOSALS & ACTIVE PLANS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    mode TEXT NOT NULL DEFAULT 'single_plan',
    plan_type TEXT NOT NULL DEFAULT 'individual',
    student_snapshot JSONB NOT NULL,
    trainer_snapshot JSONB NOT NULL,
    pricing_snapshot JSONB NOT NULL,
    participants_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    conditions_snapshot TEXT,
    valid_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS active_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'individual',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELED')),
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    frequency_per_week TEXT NOT NULL,
    duration_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    original_end_date DATE,
    original_value_cents BIGINT NOT NULL,
    discount_cents BIGINT NOT NULL DEFAULT 0,
    final_value_cents BIGINT NOT NULL,
    pricing_snapshot JSONB NOT NULL,
    participants_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    conditions_snapshot TEXT,
    suspension_extends_plan BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_plan_id UUID NOT NULL REFERENCES active_plans(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    name_snapshot TEXT NOT NULL,
    phone_snapshot TEXT,
    email_snapshot TEXT,
    role TEXT NOT NULL DEFAULT 'holder' CHECK (role IN ('holder', 'participant')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRANSFERRED', 'REMOVED')),
    joined_at DATE NOT NULL,
    left_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_plan_id UUID NOT NULL REFERENCES active_plans(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES plan_participants(id) ON DELETE CASCADE,
    participant_name_snapshot TEXT,
    scope TEXT NOT NULL CHECK (scope IN ('PLAN', 'PARTICIPANT')),
    start_date DATE NOT NULL,
    estimated_end_date DATE,
    end_date DATE,
    reason TEXT,
    extends_plan BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reactivated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS plan_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_plan_id UUID NOT NULL REFERENCES active_plans(id) ON DELETE CASCADE,
    from_participant_id UUID NOT NULL REFERENCES plan_participants(id) ON DELETE RESTRICT,
    from_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    from_name_snapshot TEXT NOT NULL,
    to_participant_id UUID NOT NULL REFERENCES plan_participants(id) ON DELETE RESTRICT,
    to_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    to_name_snapshot TEXT NOT NULL,
    effective_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_plan_id UUID NOT NULL REFERENCES active_plans(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 11. SETTINGS & SYNC METADATA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS settings (
    key TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, key)
);

CREATE TABLE IF NOT EXISTS sync_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    revision BIGINT NOT NULL,
    client_updated_at TIMESTAMPTZ NOT NULL,
    server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, entity_type, entity_id)
);


-- ==============================================================================
-- SEÇÃO: 002_rls.sql
-- ==============================================================================

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
    JOIN organization_members om ON om.organization_id = sa.organization_id AND om.user_id = auth.uid()
    WHERE sa.student_id = p_student_id
      AND sa.organization_id = org_id
      AND sa.user_id = auth.uid()
      AND sa.enabled = true
      AND sa.status = 'ACTIVE'
      AND om.status = 'active'
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


-- ==============================================================================
-- SEÇÃO: 003_indexes.sql
-- ==============================================================================

-- ==============================================================================
-- TFIVE PRO — ETAPA 1: MIGRAÇÃO FIREBASE -> SUPABASE / POSTGRESQL
-- MIGRATION 003: STRATEGIC PERFORMANCE INDEXES (BASEADO NAS CONSULTAS REAIS)
-- ==============================================================================

-- ==============================================================================
-- 1. IDENTIDADES & TENANCY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_student_access_student ON student_access(student_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_student_access_auth_uid ON student_access(user_id) WHERE user_id IS NOT NULL;

-- ==============================================================================
-- 2. CADASTRO DE ALUNOS & MAPEAMENTO LEGADO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_org_status ON students(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_students_legacy_id ON students(legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_name_search ON students(organization_id, name);

-- ==============================================================================
-- 3. EXERCÍCIOS & BIBLIOTECA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_exercises_org ON exercises(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_legacy_id ON exercises(legacy_id) WHERE legacy_id IS NOT NULL;

-- ==============================================================================
-- 4. ROTINAS, WORKOUTS & PRESCRIÇÃO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_routines_student_status ON routines(student_id, status);
CREATE INDEX IF NOT EXISTS idx_routines_legacy_id ON routines(legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routine_workouts_routine_pos ON routine_workouts(routine_id, position);
CREATE INDEX IF NOT EXISTS idx_routine_workouts_legacy_id ON routine_workouts(legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_pos ON workout_exercises(workout_id, position);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_groups_workout ON exercise_groups(workout_id, position);

-- ==============================================================================
-- 5. SESSÕES, EXECUÇÕES & SÉRIES (CONSULTAS CRÍTICAS DE HISTÓRICO E CENTRAL HOJE)
-- ==============================================================================
-- Consulta de histórico geral e última sessão executada pelo aluno
CREATE INDEX IF NOT EXISTS idx_sessions_student_start ON sessions(student_id, start_time DESC);
-- Consulta do último treino compatível (studentId + routineId + workoutId)
CREATE INDEX IF NOT EXISTS idx_sessions_student_routine_workout ON sessions(student_id, routine_id, workout_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_legacy_id ON sessions(legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(organization_id, status);

-- Exercícios executados dentro da sessão
CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id, position);
CREATE INDEX IF NOT EXISTS idx_session_exercises_exercise ON session_exercises(exercise_id);

-- Busca de última carga executada por aluno e exercício (studentId + exerciseId)
CREATE INDEX IF NOT EXISTS idx_session_sets_exercise ON session_sets(exercise_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_sets_session ON session_sets(session_id, set_number);
CREATE INDEX IF NOT EXISTS idx_session_sets_legacy_id ON session_sets(legacy_id) WHERE legacy_id IS NOT NULL;

-- Recordes Pessoais (PRs)
CREATE INDEX IF NOT EXISTS idx_personal_records_student_exercise ON personal_records(student_id, exercise_id, achieved_date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_records_recent ON personal_records(student_id, achieved_date DESC);

-- ==============================================================================
-- 6. AVALIAÇÕES FÍSICAS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_assessments_student_date ON assessments(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_legacy_id ON assessments(legacy_id) WHERE legacy_id IS NOT NULL;

-- ==============================================================================
-- 7. AGENDA & ATENDIMENTOS DE HOJE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_schedule_events_org_date_time ON schedule_events(organization_id, date, time);
CREATE INDEX IF NOT EXISTS idx_schedule_events_student_date ON schedule_events(student_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_events_status ON schedule_events(status);
CREATE INDEX IF NOT EXISTS idx_schedule_recurrences_student ON schedule_recurrences(student_id, status);

-- ==============================================================================
-- 8. PERIODIZAÇÃO: CICLOS & BLOCOS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_training_cycles_student_status ON training_cycles(student_id, status);
CREATE INDEX IF NOT EXISTS idx_training_blocks_cycle_pos ON training_blocks(cycle_id, position);

-- ==============================================================================
-- 9. TRAINING MEMORY (CENTRAL HOJE)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_training_memories_student_status ON training_memories(student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_memories_exercise ON training_memories(exercise_id) WHERE exercise_id IS NOT NULL;

-- ==============================================================================
-- 10. PLANOS ATIVOS & PARTICIPANTES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_active_plans_org_status ON active_plans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_active_plans_proposal ON active_plans(proposal_id) WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan ON plan_participants(active_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_participants_student ON plan_participants(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plan_suspensions_plan ON plan_suspensions(active_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_transfers_plan ON plan_transfers(active_plan_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_plan_audit_logs_plan ON plan_audit_logs(active_plan_id, timestamp DESC);

-- ==============================================================================
-- 11. METADADOS DE SINCRONIZAÇÃO E CONVERGÊNCIA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_sync_metadata_lookup ON sync_metadata(organization_id, entity_type, client_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_device ON sync_metadata(device_id, server_updated_at DESC);


-- ==============================================================================
-- SEÇÃO: 004_missing_domains.sql
-- ==============================================================================

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


-- ==============================================================================
-- SEÇÃO: 005_storage_buckets.sql
-- ==============================================================================

-- ==============================================================================
-- TFIVE PRO — FRESH START SUPABASE (MIGRATION 005: STORAGE BUCKETS & POLICIES)
-- Provisionamento dos 3 buckets oficiais do sistema com isolamento e RLS
-- ==============================================================================

-- 1. Criação do schema storage caso não exista (emuladores / pg-mem / staging)
CREATE SCHEMA IF NOT EXISTS storage;

-- 2. Tabela de Buckets do Supabase Storage
CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    public BOOLEAN DEFAULT false,
    avif_autodetection BOOLEAN DEFAULT false,
    file_size_limit BIGINT,
    allowed_mime_types TEXT[]
);

-- 3. Tabela de Objetos do Supabase Storage
CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id TEXT REFERENCES storage.buckets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_accessed_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    path_tokens TEXT[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
);

-- 4. Inserção idempotente dos 3 buckets oficiais requeridos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'student-avatars', 
    'student-avatars', 
    true, 
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'assessment-photos', 
    'assessment-photos', 
    false, -- Privado (apenas treinadores e aluno titular autorizado)
    20971520, -- 20MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'organization-assets', 
    'organization-assets', 
    true, -- Logos e assinaturas visuais públicas
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. Habilitar RLS no Storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS para Storage Objects
-- Student Avatars: Leitura pública, escrita apenas por treinadores da organização
CREATE POLICY "Public read for student avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-avatars');

CREATE POLICY "Trainers can upload student avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-avatars' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Trainers can update student avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'student-avatars' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Trainers can delete student avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'student-avatars' 
    AND auth.role() = 'authenticated'
  );

-- Assessment Photos: Acesso restrito a usuários autenticados
CREATE POLICY "Authenticated users access assessment photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Trainers can manage assessment photos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
  );

-- Organization Assets: Leitura pública, gestão restrita a treinadores
CREATE POLICY "Public read for organization assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-assets');

CREATE POLICY "Trainers can manage organization assets"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'organization-assets'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'organization-assets'
    AND auth.role() = 'authenticated'
  );


-- ==============================================================================
-- SEÇÃO: 006_relax_student_gender_constraint.sql
-- ==============================================================================

-- ==============================================================================
-- 006: RELAX STUDENT GENDER CONSTRAINT
-- ==============================================================================
-- Permite que o campo gender em students seja nulo de forma explícita e segura
-- sem alterar retroativamente a migration 001_initial_schema.sql.

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_gender_check;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_constraint_2;

ALTER TABLE students ADD CONSTRAINT students_gender_check 
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
