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
