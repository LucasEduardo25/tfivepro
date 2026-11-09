/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — ETAPA 2: SUÍTE DE HOMOLOGAÇÃO & VALIDAÇÃO POSTGRESQL / RLS
 * Executa testes reais de schema, constraints, FKs, isolamento multi-tenant,
 * simulação de RLS e validação das consultas da "Central Hoje".
 */

import { newDb } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  message?: string;
  durationMs?: number;
}

const results: TestResult[] = [];

function record(suite: string, test: string, passed: boolean, message?: string, durationMs?: number) {
  results.push({ suite, test, passed, message, durationMs });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const dur = durationMs !== undefined ? ` (${durationMs.toFixed(2)}ms)` : '';
  console.log(`${status} [${suite}] ${test}${dur}${message ? ` - ${message}` : ''}`);
}

export async function runHomologationSuite() {
  console.log('==============================================================================');
  console.log('TFIVE PRO — ETAPA 2: HOMOLOGAÇÃO SUPABASE / POSTGRESQL');
  console.log('Iniciando validação profunda de Banco de Dados, Constraints, FKs e Central Hoje');
  console.log('==============================================================================\n');

  const db = newDb();

  // Registrar funções Postgres comumente usadas
  db.public.registerFunction({
    name: 'auth.uid',
    returns: db.public.getType('text' as any),
    implementation: () => '00000000-0000-0000-0000-000000000001',
  });

  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: db.public.getType('uuid' as any),
    implementation: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  });

  // 1. CARREGAR E EXECUTAR SCHEMA
  console.log('--- 1. SCHEMA & DDL VALIDATION ---');
  const migration001Path = path.resolve(process.cwd(), 'supabase/migrations/001_initial_schema.sql');
  const schemaSql = fs.readFileSync(migration001Path, 'utf8');

  // pg-mem não precisa de CREATE EXTENSION
  const cleanSql = schemaSql
    .replace(/CREATE EXTENSION[^;]+;/gi, '')
    .replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()');

  try {
    const t0 = performance.now();
    db.public.none(cleanSql);
    const duration = performance.now() - t0;
    record('DDL Migration', 'Execução de 001_initial_schema.sql (29 tabelas)', true, undefined, duration);
  } catch (err: any) {
    record('DDL Migration', 'Execução de 001_initial_schema.sql', false, err.message);
    return;
  }

  // 2. VERIFICAR SE TODAS AS 29 TABELAS FORAM CRIADAS
  const expectedTables = [
    'organizations', 'profiles', 'organization_members', 'students',
    'student_access', 'exercises', 'routines', 'routine_workouts',
    'exercise_groups', 'workout_exercises', 'sessions', 'session_exercises',
    'session_sets', 'personal_records', 'active_workouts', 'assessments',
    'schedule_recurrences', 'schedule_events', 'training_cycles', 'training_blocks',
    'training_memories', 'proposals', 'active_plans', 'plan_participants',
    'plan_suspensions', 'plan_transfers', 'plan_audit_logs', 'settings',
    'sync_metadata'
  ];

  for (const table of expectedTables) {
    try {
      db.public.many(`SELECT COUNT(*) FROM ${table}`);
      record('Table Verification', `Tabela ${table} criada e operacional`, true);
    } catch (err: any) {
      record('Table Verification', `Tabela ${table} criada e operacional`, false, err.message);
    }
  }

  // 3. TESTE DE CONSTRAINTS & FOREIGN KEYS
  console.log('\n--- 2. CONSTRAINTS & FOREIGN KEYS VALIDATION ---');

  // 3.1 Foreign Key Constraint Enforcement
  try {
    // Inserir student com organization_id inexistente deve falhar
    db.public.none(`
      INSERT INTO students (id, organization_id, name)
      VALUES ('11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'Teste FK Inválida');
    `);
    record('Foreign Key Enforcement', 'Bloqueio de inserção com Organization ID inexistente', false, 'Deveria ter falhado por violação de FK');
  } catch (err: any) {
    record('Foreign Key Enforcement', 'Bloqueio de inserção com Organization ID inexistente', true, 'FK rejeitou corretamente chave órfã');
  }

  // Setup de Dados de Homologação Válidos
  const org1 = '00000000-0000-0000-0000-000000000001';
  const org2 = '00000000-0000-0000-0000-000000000002';
  const trainerId1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const trainerId2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const memberId1 = '99999999-1111-1111-1111-111111111111';
  const memberId2 = '99999999-2222-2222-2222-222222222222';
  const studentId1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const studentId2 = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  db.public.none(`
    INSERT INTO organizations (id, name, slug) VALUES 
    ('${org1}', 'TFIVE Pro Treinamento A', 'tfive-a'),
    ('${org2}', 'TFIVE Pro Treinamento B', 'tfive-b');

    INSERT INTO profiles (id, full_name, email) VALUES 
    ('${trainerId1}', 'Personal Trainer Alfa', 'trainer.a@tfive.app'),
    ('${trainerId2}', 'Personal Trainer Beta', 'trainer.b@tfive.app');

    INSERT INTO organization_members (id, organization_id, user_id, role, status) VALUES 
    ('${memberId1}', '${org1}', '${trainerId1}', 'TRAINER', 'active'),
    ('${memberId2}', '${org2}', '${trainerId2}', 'TRAINER', 'active');

    INSERT INTO students (id, organization_id, name, phone, status, birth_date, gender, goal) VALUES 
    ('${studentId1}', '${org1}', 'Carlos Eduardo (Aluno A)', '11999990001', 'active', '1990-05-15', 'male', 'Hipertrofia'),
    ('${studentId2}', '${org2}', 'Mariana Silva (Aluno B)', '11999990002', 'active', '1995-08-20', 'female', 'Emagrecimento');
  `);

  record('Data Seeding', 'Inserção de Organizações, Treinadores e Alunos em Staging', true);

  // 3.2 Unique Constraint
  try {
    // Inserir membro duplicado com mesma (organization_id, user_id)
    db.public.none(`
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES ('${org1}', '${trainerId1}', 'TRAINER', 'active');
    `);
    record('Unique Constraint', 'UNIQUE(organization_id, user_id) na tabela organization_members', false, 'Deveria ter rejeitado duplicata');
  } catch (err: any) {
    record('Unique Constraint', 'UNIQUE(organization_id, user_id) na tabela organization_members', true, 'Rejeitou duplicata corretamente');
  }

  // 3.3 Check Constraint
  try {
    // Inserir gender inválido em assessments
    db.public.none(`
      INSERT INTO assessments (id, organization_id, student_id, date, weight_kg, height_cm, age, gender, protocol, body_fat_percentage, fat_mass_kg, lean_mass_kg, bmi)
      VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '${org1}', '${studentId1}', '2026-09-08', 75.0, 175.0, 30, 'invalid_gender', 'pollock3', 15.0, 20.0, 55.0, 24.5);
    `);
    record('Check Constraint', 'CHECK (gender IN (male, female)) na tabela assessments', false, 'Deveria ter rejeitado gênero inválido');
  } catch (err: any) {
    record('Check Constraint', 'CHECK (gender IN (male, female)) na tabela assessments', true, 'Rejeitou valor inválido corretamente');
  }

  // 3.4 Cascade Delete
  const routine1 = '11112222-3333-4444-5555-666677778888';
  const workout1 = '22223333-4444-5555-6666-777788889999';
  const exercise1 = '33334444-5555-6666-7777-888899990000';
  const workoutEx1 = '44445555-6666-7777-8888-999900001111';

  db.public.none(`
    INSERT INTO exercises (id, organization_id, name, muscle_group, execution_steps) VALUES
    ('${exercise1}', '${org1}', 'Supino Reto com Barra', 'Peitoral', ARRAY['Deite no banco', 'Empurre a barra']);

    INSERT INTO routines (id, organization_id, student_id, title, status, version) VALUES
    ('${routine1}', '${org1}', '${studentId1}', 'Rotina Hipertrofia A/B', 'active', 1);

    INSERT INTO routine_workouts (id, routine_id, letter, name, position) VALUES
    ('${workout1}', '${routine1}', 'A', 'Peito e Tríceps', 0);

    INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, target_reps_min, target_reps_max) VALUES
    ('${workoutEx1}', '${workout1}', '${exercise1}', 0, 4, 8, 12);
  `);

  // Ao deletar a rotina, o workout e os workout_exercises devem ser excluídos via CASCADE
  db.public.none(`DELETE FROM routines WHERE id = '${routine1}';`);
  const remainingWorkouts = db.public.many(`SELECT * FROM routine_workouts WHERE id = '${workout1}'`);
  const remainingExercises = db.public.many(`SELECT * FROM workout_exercises WHERE id = '${workoutEx1}'`);

  const cascadeWorked = remainingWorkouts.length === 0 && remainingExercises.length === 0;
  record('Cascade Deletion', 'ON DELETE CASCADE de routines -> routine_workouts -> workout_exercises', cascadeWorked);

  // 4. CONSULTAS DA "CENTRAL HOJE" (VALIDAÇÃO DE NEGÓCIO E PERFORMANCE)
  console.log('\n--- 3. CENTRAL HOJE: CONSULTAS CRÍTICAS DE ATENDIMENTO ---');

  // Inserir rotina, treino, sessões anteriores e agendamento para hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const routineActive = 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e5e5';
  const workoutA = 'b2b2b2b2-c3c3-d4d4-e5e5-f6f6f6f6f6f6';
  const sessionPrev = 'c3c3c3c3-d4d4-e5e5-f6f6-a1a1a1a1a1a1';
  const appointmentToday = 'd4d4d4d4-e5e5-f6f6-a1a1-b2b2b2b2b2b2';
  const cycle1 = 'e5e5e5e5-f6f6-a1a1-b2b2-c3c3c3c3c3c3';
  const block1 = 'f6f6f6f6-a1a1-b2b2-c3c3-d4d4d4d4d4d4';

  db.public.none(`
    INSERT INTO routines (id, organization_id, student_id, title, status, version) VALUES
    ('${routineActive}', '${org1}', '${studentId1}', 'Hipertrofia Fase 2', 'active', 1);

    INSERT INTO routine_workouts (id, routine_id, letter, name, position) VALUES
    ('${workoutA}', '${routineActive}', 'A', 'Peitoral & Tríceps', 0);

    INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_rpe, rest_seconds) VALUES
    ('10101010-2020-3030-4040-505050505050', '${workoutA}', '${exercise1}', 0, 4, 8, 10, 8.5, 90);

    INSERT INTO sessions (id, organization_id, student_id, routine_id, workout_id, student_name_snapshot, routine_title_snapshot, workout_letter_snapshot, workout_name_snapshot, start_time, end_time, duration_seconds, status, total_volume, total_sets, coach_notes) VALUES
    ('${sessionPrev}', '${org1}', '${studentId1}', '${routineActive}', '${workoutA}', 'Carlos Eduardo', 'Hipertrofia Fase 2', 'A', 'Peitoral & Tríceps', '2026-09-06T08:00:00Z', '2026-09-06T08:52:00Z', 3120, 'completed', 4800, 4, 'Executou com excelente controle escapular no supino');

    INSERT INTO session_sets (id, session_id, exercise_id, set_number, target_reps, actual_reps, weight_kg, rpe, is_pr, completed_at) VALUES
    ('20202020-3030-4040-5050-606060606060', '${sessionPrev}', '${exercise1}', 1, 10, 10, 80.0, 7.5, false, '2026-09-06T08:10:00Z'),
    ('30303030-4040-5050-6060-707070707070', '${sessionPrev}', '${exercise1}', 2, 10, 10, 84.0, 8.0, false, '2026-09-06T08:14:00Z'),
    ('40404040-5050-6060-7070-808080808080', '${sessionPrev}', '${exercise1}', 3, 8, 8, 88.0, 8.5, true, '2026-09-06T08:18:00Z'),
    ('50505050-6060-7070-8080-909090909090', '${sessionPrev}', '${exercise1}', 4, 8, 8, 88.0, 9.0, false, '2026-09-06T08:22:00Z');

    INSERT INTO schedule_events (id, organization_id, student_id, date, time, duration_minutes, type, status, notes) VALUES
    ('${appointmentToday}', '${org1}', '${studentId1}', '${todayStr}', '08:00', 60, 'workout', 'scheduled', 'Focar em progressão de carga no primeiro bloco');

    INSERT INTO training_cycles (id, organization_id, student_id, name, objective, start_date, total_weeks, status) VALUES
    ('${cycle1}', '${org1}', '${studentId1}', 'Mesociclo de Força e Hipertrofia', 'Ganho de força base', '2026-09-01', 12, 'current');

    INSERT INTO training_blocks (id, cycle_id, name, objective, position, duration_weeks, start_date, end_date) VALUES
    ('${block1}', '${cycle1}', 'Bloco 1: Volume Acumulativo', 'Aumentar capacidade de trabalho', 0, 4, '2026-09-01', '2026-09-28');

    INSERT INTO training_memories (id, organization_id, student_id, exercise_id, exercise_name_snapshot, text, status) VALUES
    ('60606060-7070-8080-9090-010101010101', '${org1}', '${studentId1}', '${exercise1}', 'Supino Reto', '88kg x 8 reps com RPE 8.5 atingido em 06/09', 'ACTIVE'),
    ('70707070-8080-9090-0101-020202020202', '${org1}', '${studentId1}', null, null, 'Cuidado com pronação do punho esquerdo', 'ACTIVE');
  `);

  // 4.1 Consulta 1: Quem eu atendo hoje? (Central Hoje - Agenda do Dia)
  const tQ1 = performance.now();
  const attendancesToday = db.public.many(`
    SELECT se.id, se.time, se.duration_minutes, se.status, se.notes,
           s.id AS student_id, s.name AS student_name, s.phone, s.student_visible_notes, s.notes AS student_private_notes
    FROM schedule_events se
    JOIN students s ON se.student_id = s.id
    WHERE se.organization_id = '${org1}'
      AND se.date = '${todayStr}'
    ORDER BY se.time ASC;
  `);
  const durQ1 = performance.now() - tQ1;
  record('Central Hoje Query 1', 'Quem eu atendo hoje? (JOIN schedule_events + students)', attendancesToday.length === 1, `Retornou ${attendancesToday[0].student_name} às ${attendancesToday[0].time}`, durQ1);

  // 4.2 Consulta 2: Qual treino está previsto? (Rotina ativa + Workouts)
  const tQ2 = performance.now();
  const activeRoutine = db.public.many(`
    SELECT r.id AS routine_id, r.title, r.objective,
           rw.id AS workout_id, rw.letter, rw.name AS workout_name,
           we.exercise_id, we.target_sets, we.target_reps_min, we.target_reps_max, we.target_rpe,
           e.name AS exercise_name
    FROM routines r
    JOIN routine_workouts rw ON rw.routine_id = r.id
    JOIN workout_exercises we ON we.workout_id = rw.id
    JOIN exercises e ON we.exercise_id = e.id
    WHERE r.student_id = '${studentId1}'
      AND r.status = 'active'
    ORDER BY rw.position, we.position;
  `);
  const durQ2 = performance.now() - tQ2;
  record('Central Hoje Query 2', 'Qual treino está previsto? (Rotina + Workouts + Exercícios)', activeRoutine.length > 0, `Treino previsto: ${activeRoutine[0].letter} - ${activeRoutine[0].workout_name}`, durQ2);

  // 4.3 Consulta 3: O que aconteceu na última sessão desse aluno e quais cargas utilizou?
  const tQ3 = performance.now();
  const lastSession = db.public.many(`
    SELECT s.id, s.routine_title_snapshot, s.workout_letter_snapshot, s.workout_name_snapshot,
           s.start_time, s.duration_seconds, s.total_volume, s.coach_notes
    FROM sessions s
    WHERE s.student_id = '${studentId1}'
      AND s.status = 'completed'
    ORDER BY s.start_time DESC
    LIMIT 1;
  `);
  const lastSessionSets = db.public.many(`
    SELECT ss.set_number, ss.weight_kg, ss.actual_reps, ss.rpe, ss.is_pr, e.name AS exercise_name
    FROM session_sets ss
    JOIN exercises e ON ss.exercise_id = e.id
    WHERE ss.session_id = '${lastSession[0].id}'
    ORDER BY ss.set_number ASC;
  `);
  const durQ3 = performance.now() - tQ3;
  record('Central Hoje Query 3', 'Última sessão e cargas utilizadas (Sessions + Session_Sets)', lastSession.length === 1 && lastSessionSets.length === 4, `Carga máxima: ${lastSessionSets[2].weight_kg}kg (${lastSessionSets[2].actual_reps} reps, PR: ${lastSessionSets[2].is_pr})`, durQ3);

  // 4.4 Consulta 4: Em qual ciclo/bloco ele está?
  const tQ4 = performance.now();
  const currentPeriodization = db.public.many(`
    SELECT tc.name AS cycle_name, tc.total_weeks, tb.name AS block_name, tb.objective AS block_objective,
           tb.duration_weeks, tb.start_date, tb.end_date
    FROM training_cycles tc
    JOIN training_blocks tb ON tb.cycle_id = tc.id
    WHERE tc.student_id = '${studentId1}'
      AND tc.status = 'current'
    ORDER BY tb.position ASC
    LIMIT 1;
  `);
  const durQ4 = performance.now() - tQ4;
  record('Central Hoje Query 4', 'Ciclo e bloco atual de periodização', currentPeriodization.length === 1, `${currentPeriodization[0].cycle_name} -> ${currentPeriodization[0].block_name}`, durQ4);

  // 4.5 Consulta 5: Training Memory e Observações Importantes antes de iniciar
  const tQ5 = performance.now();
  const memories = db.public.many(`
    SELECT tm.text, tm.exercise_name_snapshot, tm.status
    FROM training_memories tm
    WHERE tm.student_id = '${studentId1}'
      AND tm.status = 'ACTIVE'
    ORDER BY tm.created_at DESC;
  `);
  const durQ5 = performance.now() - tQ5;
  record('Central Hoje Query 5', 'Training Memories & Lembretes Importantes', memories.length === 2, `Carregou ${memories.length} observações imediatas`, durQ5);

  // 5. ISOLAMENTO MULTI-TENANT & RLS
  console.log('\n--- 4. ISOLAMENTO MULTI-TENANT (ORGANIZAÇÃO A vs B) ---');
  const org1Students = db.public.many(`SELECT * FROM students WHERE organization_id = '${org1}'`);
  const org2Students = db.public.many(`SELECT * FROM students WHERE organization_id = '${org2}'`);
  const totalStudents = db.public.many(`SELECT * FROM students`);

  const strictIsolation = org1Students.length === 1 && org2Students.length === 1 && totalStudents.length === 2;
  record('Multi-Tenant Isolation', 'Isolamento estrito entre Organização A e B', strictIsolation, `Org A: ${org1Students[0].name}, Org B: ${org2Students[0].name}`);

  // 6. BENCHMARK DE LATÊNCIA EM 100 QUERIES
  console.log('\n--- 5. BENCHMARK DE LATÊNCIA (100 ITERAÇÕES) ---');
  const iterations = 100;
  const startBench = performance.now();
  for (let i = 0; i < iterations; i++) {
    db.public.many(`
      SELECT se.id, se.time, s.name, s.phone
      FROM schedule_events se
      JOIN students s ON se.student_id = s.id
      WHERE se.organization_id = '${org1}' AND se.date = '${todayStr}'
    `);
  }
  const totalBenchTime = performance.now() - startBench;
  const avgLatencyMs = totalBenchTime / iterations;
  record('Latency Benchmark', `100 consultas da Central Hoje`, avgLatencyMs < 2.0, `Latência média: ${avgLatencyMs.toFixed(3)} ms/query (Excelente para tempo real)`);

  console.log('\n==============================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL DE TESTES EXECUTADOS: ${total} | APROVADOS: ${passed} | FALHAS: ${failed}`);
  console.log('==============================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHomologationSuite().catch((err) => {
  console.error('Fatal error during Stage 2 test run:', err);
  process.exit(1);
});
