# RELATÓRIO DE MIGRAÇÃO — ETAPA 3.2 (FONTE REAL VIA BACKUP JSON)
Data/Hora de Execução: 2026-09-09T18:34:22.728Z
Status Geral: ✅ SUCESSO
Modo de Execução: **DRY_RUN**
Origem dos Dados: **FIXTURE_TEST** 
Ambiente de Origem: `TFIVE_LOCAL_FIRST_PROD (IndexedDB + Backup Export)`
Ambiente de Destino: `SUPABASE_POSTGRESQL_STAGING`
Versão do App: `TFIVE PRO 5.0.0`
Schema Alvo: `001_initial_schema + 004_missing_domains (39 tables)`

---

## 1. PRINCÍPIOS DE SEGURANÇA RESPEITADOS
- **NÃO foi realizado Cutover.**
- **NÃO foi alterada a produção.**
- **NÃO foi removido o Firebase.**
- **NÃO foi removido o IndexedDB.**
- **Fixtures foram permanentemente eliminadas da execução real.**
- **Fail-Closed ativo**: Execução real condicionada estritamente à presença e integridade do backup JSON.

---

## 2. CONFERÊNCIA DE CONTAGENS (SOURCE vs TARGET)
| Entidade / Tabela | Origem (IndexedDB Backup) | Destino (PostgreSQL) | Diferença | Status |
|---|---|---|---|---|
| **organizations** | 1 | 1 | +0 | ✅ OK |
| **students** | 2 | 2 | +0 | ✅ OK |
| **student_access** | 0 | 0 | +0 | ✅ OK |
| **exercises** | 1 | 237 | +236 | ✅ OK |
| **routines** | 1 | 1 | +0 | ✅ OK |
| **routine_workouts** | 1 | 1 | +0 | ✅ OK |
| **workout_exercises** | 1 | 1 | +0 | ✅ OK |
| **sessions** | 1 | 1 | +0 | ✅ OK |
| **session_sets** | 1 | 1 | +0 | ✅ OK |
| **active_workouts** | 0 | 0 | +0 | ✅ OK |
| **assessments** | 0 | 0 | +0 | ✅ OK |
| **schedule_recurrences** | 0 | 0 | +0 | ✅ OK |
| **schedule_events** | 0 | 0 | +0 | ✅ OK |
| **training_cycles** | 0 | 0 | +0 | ✅ OK |
| **training_blocks** | 0 | 0 | +0 | ✅ OK |
| **training_memories** | 0 | 0 | +0 | ✅ OK |
| **proposals** | 0 | 0 | +0 | ✅ OK |
| **proposal_templates** | 0 | 0 | +0 | ✅ OK |
| **active_plans** | 0 | 0 | +0 | ✅ OK |
| **plan_participants** | 0 | 0 | +0 | ✅ OK |
| **settings** | 1 | 1 | +0 | ✅ OK |
| **photos** | 0 | 0 | +0 | ✅ OK |
| **functional_tests** | 0 | 0 | +0 | ✅ OK |
| **functional_assessments** | 0 | 0 | +0 | ✅ OK |
| **functional_goals** | 0 | 0 | +0 | ✅ OK |
| **functional_milestones** | 0 | 0 | +0 | ✅ OK |
| **functional_batteries** | 0 | 0 | +0 | ✅ OK |
| **evolution_reports** | 0 | 0 | +0 | ✅ OK |
| **workout_templates** | 0 | 0 | +0 | ✅ OK |
| **student_onboardings** | 0 | 0 | +0 | ✅ OK |
| **app_users** | 0 | 0 | +0 | ✅ OK |

---

## 3. AUDITORIA DA SYNC QUEUE
- Total de Itens: **1**
- Pendentes: **0**
- Em Processamento: **0**
- Falhas: **0**
- Concluídos: **1**

---

## 4. RESUMO DE RECONCILIAÇÃO DETERMINÍSTICA
- Total de Entidades Mapeadas: **10**
- Migradas com Sucesso: **10**
- Ignoradas (Idempotência/Existentes): **0**
- Conflitos Identificados: **0**
- Falhas: **0**

---

## 5. BACKUP DE PRÉ-MIGRATION & INTEGRIDADE SHA-256
- Arquivo de Auditoria Gerado: `/app/applet/supabase/backups/pre_migration_backup_mig_1788978862728_88bbc14f.json`
- Checksum SHA-256: `014b184a28baf9c627d4d151f5ec14b4fe9b3fb2d42e038b2ee7e2f45bc106cd`
