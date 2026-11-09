# TFIVE PRO — ETAPA 3.1: RELATÓRIO DE VERIFICAÇÃO FORENSE DA ORIGEM DOS DADOS
**Data da Auditoria:** 08/09/2026  
**Auditor:** Agente de Engenharia & Migração  
**Migration Run Auditado:** `mig_1788909052285_23da0050`  
**Classificação Final:** `C) TEST_OR_SYNTHETIC_DATA`  
**Decisão da Transição para Etapa 4:** 🛑 **NO-GO ABSOLUTO**

---

## 1. Identificação da Origem Exata Utilizada na Etapa 3

A investigação forense detalhada do arquivo `/scripts/migrateToSupabaseStaging.ts` e do runtime de execução revelou com precisão matemática a origem dos dados:

- **Origem dos Registros:** **C / D / G — Fixtures sintéticas / Mocks hardcoded em TypeScript**.
- **Arquivo Fonte:** `/scripts/migrateToSupabaseStaging.ts`, especificamente a função `loadSourceData()` (linhas 147 a 1250).
- **Banco de Dados Conectado:** Nenhum banco real de produção (IndexedDB ou Firestore) foi lido ou conectado.
- **Database Name / Version:** Não houve leitura de `tfive_pro_v5_db` (versão 13). O runtime Node.js em que o script foi executado (`tsx`) não possui acesso ao `window.indexedDB` do navegador do usuário.
- **Firebase Project / Firestore:** Nenhuma credencial ou projeto Firebase foi utilizado. Nenhuma leitura em coleções do Firestore foi efetuada.
- **Ambiente de Execução:** CLI em container Cloud Run, gravando em instância PostgreSQL em memória (`pg-mem`).
- **Método de Carga:** Instanciação estática em memória através de literais de objetos (`students = [...]`, `exercises = [...]`, etc.).

---

## 2. Auditoria Técnica do Script de Migração (`/scripts/migrateToSupabaseStaging.ts`)

O script de migração foi minuciosamente inspecionado:

1. **Leitura de IndexedDB:**
   - **NÃO EXISTE.** O script não importa a API `window.indexedDB`, não utiliza emuladores (`fake-indexeddb`) e não importa os métodos de persistência de `/src/db/indexedDB.ts`.
2. **Leitura de Firestore:**
   - **NÃO EXISTE.** O script não importa `@firebase/firestore` nem `@google-cloud/firestore` / `firebase-admin`, não autentica e não realiza requisições de rede para obter documentos remotos.
3. **Existência de Fixtures e Arrays Hardcoded:**
   - **CONFIRMADA.** Toda a base de origem utilizada na Etapa 3 reside como literais no próprio código-fonte:
     - 5 alunos (`std_carlos`, `std_mariana`, `std_rodrigo`, `std_beatriz`, `std_fernando`)
     - 8 exercícios (`ex_supino_reto`, `ex_crucifixo_halteres`, `ex_triceps_polia`, `ex_agachamento_livre`, `ex_leg_press`, `ex_puxada_alta`, `ex_remada_curvada`, `ex_elevacao_lateral`)
     - 5 rotinas (incluindo rotina ABCD com bi-set `grp_biset_peito`)
     - 10 sessões de treino com 30 séries (sets) embutidas
     - 5 avaliações antropométricas
     - 5 agendamentos de agenda
     - 2 ciclos de treino
     - 3 propostas comerciais
     - 3 planos ativos
     - 4 registros de fila de sincronização (`sq_1` a `sq_4`)
     - 3 configurações de sistema

---

## 3. Auditoria Forense do Arquivo de Backup

- **Arquivo:** `/supabase/backups/pre_migration_backup_mig_1788909052285_23da0050.json`
- **Tamanho Exato:** **54.449 bytes** (~0,0519 MB / 53,17 KB)
- **Hash SHA-256 Recalculado:** `0ae0bd03bce228fd625737e75d72964ce1088aa8444a9ee27ecba3a1b6696310`
- **Hash SHA-256 Registrado no Relatório:** `0ae0bd03bce228fd625737e75d72964ce1088aa8444a9ee27ecba3a1b6696310`
- **Resultado do Hash:** ✅ **MATCH (100% idêntico)**
- **Contagem Real de Entidades dentro do Backup (`sourceData`):**
  - `students`: **5**
  - `exercises`: **8**
  - `routines`: **5**
  - `sessions`: **10**
  - `assessments`: **5**
  - `schedule`: **5**
  - `training_cycles`: **2**
  - `proposals`: **3**
  - `active_plans`: **3**
  - `sync_queue`: **4**
  - `settings`: **3**
  - `training_memories`: **3**
  - `schedule_recurrences`: **2**
- **Observação:** O backup é uma serialização fiel do objeto em memória `sourceData` gerado pela fixture, sem conter dados de produção reais de usuários.

---

## 4. Auditoria do IndexedDB Real da Aplicação (`tfive_pro_v5_db`)

- **Nome do Banco Local:** `tfive_pro_v5_db`
- **Versão do Schema:** `13`
- **Natureza Arquitetural:** O TFIVE PRO é um aplicativo **Local-First PWA**. O IndexedDB reside no armazenamento local do navegador do usuário (Client-Side). O ambiente do servidor Node.js não possui acesso direto à base de armazenamento do navegador dos clientes.
- **Lista dos 29 Object Stores Existentes no Schema (`src/db/indexedDB.ts`):**
  1. `students`
  2. `exercises`
  3. `routines`
  4. `sessions`
  5. `assessments`
  6. `schedule`
  7. `schedule_recurrences`
  8. `settings`
  9. `active_workouts`
  10. `photos`
  11. `functional_tests`
  12. `functional_assessments`
  13. `functional_goals`
  14. `functional_milestones`
  15. `functional_batteries`
  16. `active_workout`
  17. `evolution_reports`
  18. `workout_templates`
  19. `proposals`
  20. `proposal_templates`
  21. `training_cycles`
  22. `student_onboardings`
  23. `student_access`
  24. `app_users`
  25. `active_plans`
  26. `plan_transfers`
  27. `plan_suspensions`
  28. `plan_audit_logs`
  29. `training_memories`
- **Fila de Sincronização (`sync_queue`):** Armazenada no `localStorage` sob a chave `tfive_sync_queue_v1`.
- **Comportamento de Seed:** Na inicialização em navegador limpo (`seedInitialDataIfNeeded()`), o store `exercises` recebe **236 exercícios** do catálogo base. Conforme registrado no código: *"NO dummy students, NO dummy workouts, NO dummy schedule or assessments are created."*

---

## 5. Investigação da Discrepância de Exercícios (8 vs >300)

**Causa Raiz Identificada e Comprovada:**
1. O repositório possui um catálogo base de exercícios no arquivo `/src/data/exerciseBank.ts` (`INITIAL_EXERCISES`) com **236 exercícios** cadastrados e categorizados por grupamento muscular. No script `/scripts/buildExerciseBank.js`, constam **237 exercícios**. Na ETAPA 1, foi feita uma menção de grandeza de "mais de 300 exercícios" em alusão ao catálogo de exercícios do aplicativo.
2. Na ETAPA 3, o script `/scripts/migrateToSupabaseStaging.ts` **não importou `INITIAL_EXERCISES` nem leu o IndexedDB**. O autor do script escreveu manualmente um array simplificado contendo apenas **8 exercícios** (`ex_supino_reto`, `ex_crucifixo_halteres`, `ex_triceps_polia`, `ex_agachamento_livre`, `ex_leg_press`, `ex_puxada_alta`, `ex_remada_curvada`, `ex_elevacao_lateral`), que eram os únicos necessários para suprir os treinos da rotina de teste do aluno simulado `std_carlos`.
3. Portanto, os 228 exercícios restantes do catálogo do sistema foram completamente omitidos da massa de migração da Etapa 3.

---

## 6. Investigação do Firestore Real

1. **Estrutura de Coleções:** No modelo arquitetural do app (`src/services/syncService.ts`), as coleções do Firestore são aninhadas por usuário:
   `tfive_users/{userId}/{storeName}`
   onde `{storeName}` representa os stores locais (`students`, `routines`, etc.). Não existem coleções de produção na raiz do Firestore (`/students`, `/routines`).
2. **Estado no Backend:** O container do servidor não possui variáveis de ambiente (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`) nem credenciais de conta de serviço configuradas para conectar no Firestore em produção.
3. **Modo de Operação Atual:** A aplicação roda em modo Local-First; quando o Firebase não está configurado no cliente, o `syncService` utiliza o simulador de nuvem em `localStorage` (`tfive_cloud_simulator_docs_v1`).

---

## 7. Comparativo das Fontes de Dados

| Entidade | IndexedDB Real (Instalação / Base App) | Firestore Real | Backup Etapa 3 (`sourceData`) | Supabase Staging (`pg-mem`) |
| :--- | :---: | :---: | :---: | :---: |
| **students** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/students` | 5 (Sintéticos) | 5 |
| **exercises** | 236 (`INITIAL_EXERCISES`) + custom | Catálogo estático / sem docs na nuvem | 8 (Sintéticos) | 8 |
| **routines** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/routines` | 5 (Sintéticos) | 5 |
| **routine_workouts** | Embutidos nas rotinas | Embutidos nas rotinas | 9 (Sintéticos) | 9 |
| **workout_exercises** | Embutidos nos treinos | Embutidos nos treinos | 15 (Sintéticos) | 15 |
| **exercise_groups** | Embutidos nos treinos | Embutidos nos treinos | 1 (Sintético) | 1 |
| **sessions** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/sessions` | 10 (Sintéticos) | 10 |
| **session_sets** | Embutidos nas sessões | Embutidos nas sessões | 30 (Sintéticos) | 30 |
| **assessments** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/assessments` | 5 (Sintéticos) | 5 |
| **schedule** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/schedule` | 5 (Sintéticos) | 5 |
| **schedule_recurrences** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/schedule_recurrences` | 2 (Sintéticos) | 2 |
| **training_cycles** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/training_cycles` | 2 (Sintéticos) | 2 |
| **training_blocks** | Embutidos nos ciclos | Embutidos nos ciclos | 3 (Sintéticos) | 3 |
| **training_memories** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/training_memories` | 3 (Sintéticos) | 3 |
| **proposals** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/proposals` | 3 (Sintéticos) | 3 |
| **active_plans** | Dados reais do usuário no Browser | Sob `tfive_users/{userId}/active_plans` | 3 (Sintéticos) | 3 |
| **plan_participants** | Embutidos nos planos | Embutidos nos planos | 3 (Sintéticos) | 3 |
| **sync_queue** | `localStorage` (`tfive_sync_queue_v1`) | `tfive_users/{userId}/sync_events` | 4 (Sintéticos) | N/A |
| **settings** | Dados reais no Browser | Sob `tfive_users/{userId}/settings` | 3 (Sintéticos) | 3 |

---

## 8. Validação dos Session Sets

- **Contagem no Relatório Anterior:** 10 sessões, 30 séries (sets).
- **Auditoria dos Sets na Origem:**
  - Sessão 1 (`sess_carlos_1`): 6 sets (`set_c1` a `set_c6`)
  - Sessão 2 (`sess_carlos_2`): 4 sets (`set_c7` a `set_c10`)
  - Sessão 3 (`sess_mariana_1`): 3 sets
  - Sessão 4 (`sess_mariana_2`): 3 sets
  - Sessão 5 (`sess_rodrigo_1`): 2 sets
  - Sessão 6 (`sess_rodrigo_2`): 2 sets
  - Sessão 7 (`sess_beatriz_1`): 3 sets
  - Sessão 8 (`sess_beatriz_2`): 3 sets
  - Sessão 9 (`sess_fernando_1`): 2 sets
  - Sessão 10 (`sess_fernando_2`): 2 sets
- **Veredito:** Os 30 sets foram gerados manualmente dentro de `scripts/migrateToSupabaseStaging.ts` para testar a relação 1:N entre sessões e séries. **Nenhum deles é proveniente de sessões reais executadas por alunos reais.**

---

## 9. Identificação de Dados de Teste no Código

A busca no projeto comprovou a natureza de teste dos seguintes identificadores:
- `std_carlos` / "Carlos Eduardo Santos": Declarado em `scripts/migrateToSupabaseStaging.ts:172` e usado como fixture de teste de segurança em `src/utils/securityAuditRunner.ts:33`.
- `grp_biset_peito`: Declarado em `scripts/migrateToSupabaseStaging.ts:364` para testar agrupamentos de bi-set.
- `std_mariana`, `std_rodrigo`, `std_beatriz`, `std_fernando`: Alunos puramente fictícios criados dentro da fixture da Etapa 3.

---

## 10. Classificação Obrigatória da Etapa 3

Conforme as definições formais:

- [ ] **A) VERIFIED_REAL_DATA** — A migração realmente utilizou a base real completa.
- [ ] **B) PARTIAL_REAL_DATA** — A migração utilizou dados reais, porém somente um subconjunto.
- [x] **C) TEST_OR_SYNTHETIC_DATA** — **A MIGRATION RUN DA ETAPA 3 UTILIZOU EXCLUSIVAMENTE FIXTURES / MOCKS / TEST DATA. A MIGRAÇÃO AINDA NÃO OCORREU SOBRE UMA CÓPIA DA BASE REAL DO USUÁRIO.**

---

## 11. Decisão: GO / NO-GO

### 🛑 **DECISÃO: NO-GO ABSOLUTO PARA ETAPA 4**

**Justificativas Técnicas Inegociáveis:**
1. A origem real dos dados de produção do usuário (alunos reais, treinos reais, histórico de sessões, avaliações reais) **não participou da Etapa 3**.
2. O catálogo de 236 exercícios de `INITIAL_EXERCISES` foi reduzido arbitrariamente a 8 exercícios sintéticos no script de staging.
3. O backup gerado (`pre_migration_backup_mig_1788909052285_23da0050.json`) é um backup das fixtures em memória e **não representa um backup de segurança da base real**.
4. Executar qualquer cutover ou avanço para a Etapa 4 sob este estado resultaria em perda total de integridade dos dados reais de produção.

---

## 12. Próximos Passos Obrigatórios (Sob Orientação do Usuário)

Para que a Etapa 3 seja executada de forma legítima sobre a base real:
1. **Extração do Dump Real:** Obter o arquivo de exportação JSON real gerado diretamente pelo aplicativo em execução no navegador do usuário (`Settings -> Exportar Backup JSON` / função `exportDatabase()` / `backupService.createFullBackup()`), que contém o snapshot completo e autêntico de todos os 29 stores do IndexedDB do usuário.
2. **Inclusão do Catálogo Completo:** Carregar os 236 exercícios de `/src/data/exerciseBank.ts` para garantir que nenhum exercício do catálogo do sistema seja perdido.
3. **Re-execução da Etapa 3 com a Base Real Extraída:** Atualizar a rotina de carga para ler estritamente o arquivo de backup real exportado, gerando novo manifesto e novo backup de pré-migração.

**STATUS: PROCESSO PARADO. AGUARDANDO COMANDOS.**
