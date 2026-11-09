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
