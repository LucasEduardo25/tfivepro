# TFIVE PRO — ETAPA 3: RELATÓRIO DE RECONCILIAÇÃO DE IDENTIDADE

## Resumo da Reconciliação
- **Total de Itens:** `232`
- **Migrados com Sucesso (MIGRATED):** `232`
- **Ignorados por Idempotência (SKIPPED):** `0`
- **Conflitos Detectados (CONFLICT):** `0`
- **Falhas (FAILED):** `0`

---

## Tabela Completa de Mapeamento (legacy_id ➔ postgres_uuid)

| Entidade | Legacy ID (Origem) | Postgres UUID (Destino) | Status | Hash Match |
| :--- | :--- | :--- | :---: | :---: |
| `organizations` | `org_default` | `da28752a-83b1-443e-9ed4-0bc8ad7e5552` | **MIGRATED** | ✅ MATCH |
| `students` | `std_carlos` | `bc2acd3c-a265-4d66-a54f-8c894a194d56` | **MIGRATED** | ✅ MATCH |
| `students` | `std_mariana` | `b8c3f7be-f935-4a33-b057-a6c226c756e0` | **MIGRATED** | ✅ MATCH |
| `students` | `std_rodrigo` | `dbef6555-1ee3-41d6-b735-8f1e2143b495` | **MIGRATED** | ✅ MATCH |
| `students` | `std_beatriz` | `c00dfd29-9244-408b-bf98-6d20ca3d0649` | **MIGRATED** | ✅ MATCH |
| `students` | `std_fernando` | `09398b0f-ccb6-4a3c-a4e3-5d30aa1215fb` | **MIGRATED** | ✅ MATCH |
| `exercises` | `ex_supino_reto` | `cd82cda1-401a-4999-b3e2-d629a2e95eed` | **MIGRATED** | ✅ MATCH |
| `exercises` | `ex_crucifixo_halteres` | `d1d8e166-de21-4076-91f9-e68471c69cbd` | **MIGRATED** | ✅ MATCH |
| `exercises` | `ex_triceps_polia` | `0d6bfe1e-857a-48d6-bec0-93b99033a9ad` | **MIGRATED** | ✅ MATCH |
| `exercises` | `ex_agachamento_livre` | `9ef4131f-503d-4682-afa9-8104ea0004f7` | **MIGRATED** | ✅ MATCH |
| `exercises` | `ex_leg_press` | `a79d9eaa-b2bb-4807-b599-d3d288d9a89b` | **MIGRATED** | ✅ MATCH |
| `exercises` | `ex_puxada_alta` | `48584aac-b44f-4920-86ec-ce9ffd355036` | **MIGRATED** | ✅ MATCH |
| `exercises` | `ex_remada_curvada` | `748f0dc9-317a-4878-a408-aca1816956a5` | **MIGRATED** | ✅ MATCH |
| `exercises` | `ex_elevacao_lateral` | `c55b95e4-e535-42f5-88dc-d621c71e481e` | **MIGRATED** | ✅ MATCH |
| `routines` | `rt_carlos_abcd` | `fcd02c7b-9b24-44bb-85fd-160645cd58ee` | **MIGRATED** | ✅ MATCH |
| `routine_workouts` | `rw_carlos_a` | `f6e1377f-ddf6-46be-90b0-f4b3a68d9740` | **MIGRATED** | ✅ MATCH |
| `exercise_groups` | `grp_biset_peito` | `8da927c3-9fcb-43dc-beed-c4af952564f6` | **MIGRATED** | N/A |
| `workout_exercises` | `re_carlos_a1` | `ef63926d-2414-41dc-9ff6-1e16b5da530c` | **MIGRATED** | N/A |
| `workout_exercises` | `re_carlos_a2` | `fa41e0d5-3130-4329-92ed-63814632a620` | **MIGRATED** | N/A |
| `workout_exercises` | `re_carlos_a3` | `6f40f8c3-eee9-49a2-bf72-a9f40beca6f4` | **MIGRATED** | N/A |
| `routine_workouts` | `rw_carlos_b` | `97ed71f8-d464-4069-843e-97ac520f2fb1` | **MIGRATED** | ✅ MATCH |
| `workout_exercises` | `re_carlos_b1` | `fce95c5d-9091-4bee-bc92-7867130aa9e0` | **MIGRATED** | N/A |
| `workout_exercises` | `re_carlos_b2` | `b8dc4632-e427-447b-a6d0-0ddcea414fa7` | **MIGRATED** | N/A |
| `workout_exercises` | `re_carlos_b3` | `231bfba3-b0c2-48b4-95fa-089ebeec410e` | **MIGRATED** | N/A |
| `routine_workouts` | `rw_carlos_c` | `a8d7e3de-79d5-464f-81fb-d7e168fbc014` | **MIGRATED** | ✅ MATCH |
| `workout_exercises` | `re_carlos_c1` | `eebd45f9-dca0-4fc4-b548-ee66d9c21692` | **MIGRATED** | N/A |
| `workout_exercises` | `re_carlos_c2` | `2be69f50-95fa-4867-8691-4384acc07b32` | **MIGRATED** | N/A |
| `routine_workouts` | `rw_carlos_d` | `171d933d-d030-4aed-a606-7e30f0378adf` | **MIGRATED** | ✅ MATCH |
| `workout_exercises` | `re_carlos_d1` | `763e559d-aee8-441c-9f50-199bd6d55a57` | **MIGRATED** | N/A |
| `routines` | `rt_mariana_ab` | `b9eb44e0-fe9c-4a66-9c87-50ee1dc99c85` | **MIGRATED** | ✅ MATCH |
| `routine_workouts` | `rw_mariana_a` | `b8963480-f1c6-481d-aaf1-82e8a6de4b60` | **MIGRATED** | ✅ MATCH |
| `workout_exercises` | `re_mar_a1` | `23455252-63d5-4499-b22f-779a280c1dbf` | **MIGRATED** | N/A |
| `workout_exercises` | `re_mar_a2` | `d783bcac-bdea-4fcd-bfd5-b729cadcdd6d` | **MIGRATED** | N/A |
| `routine_workouts` | `rw_mariana_b` | `ef1df827-1347-41e6-aab8-08e8e808b391` | **MIGRATED** | ✅ MATCH |
| `workout_exercises` | `re_mar_b1` | `839de8e5-0339-4e50-8652-0158fc4f257b` | **MIGRATED** | N/A |
| `routines` | `rt_rodrigo_funcional` | `547562d5-5ce3-4f45-b994-3a29534067ed` | **MIGRATED** | ✅ MATCH |
| `routine_workouts` | `rw_rodrigo_a` | `844239ae-8372-4c97-b32a-0926ab448d73` | **MIGRATED** | ✅ MATCH |
| `workout_exercises` | `re_rod_a1` | `16d9fcaf-404f-4e04-8884-5cf36a3900ee` | **MIGRATED** | N/A |
| `routines` | `rt_beatriz_gluteos` | `005852a3-d5d3-4588-b029-3e08875ef550` | **MIGRATED** | ✅ MATCH |
| `routine_workouts` | `rw_bea_a` | `40ba192b-00a9-4f4d-8da8-a41ed2658a6a` | **MIGRATED** | ✅ MATCH |
| `workout_exercises` | `re_bea_a1` | `2346d8e7-ff7d-448e-a7f9-cf738d7bc821` | **MIGRATED** | N/A |
| `routines` | `rt_fernando_mobilidade` | `4d25a8a3-caae-49a6-af5c-b08493125605` | **MIGRATED** | ✅ MATCH |
| `routine_workouts` | `rw_fer_a` | `9400605e-ecaf-4b82-9431-a1b38db2d69a` | **MIGRATED** | ✅ MATCH |
| `workout_exercises` | `re_fer_a1` | `214d2466-8bf5-48bf-b737-48a556fcb55a` | **MIGRATED** | N/A |
| `sessions` | `sess_carlos_1` | `f33a7cc0-131e-4e54-ae42-aec67e631971` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_c1` | `5be98d63-9edc-46a2-9d58-1396f140cefb` | **MIGRATED** | N/A |
| `session_sets` | `set_c2` | `172a4cec-fc04-475b-afcb-360f5ba95735` | **MIGRATED** | N/A |
| `session_sets` | `set_c3` | `27285ca9-2bda-456d-aecb-cc07225a88ac` | **MIGRATED** | N/A |
| `session_sets` | `set_c4` | `594313f9-b01a-440d-8549-7ada820b8257` | **MIGRATED** | N/A |
| `session_sets` | `set_c5` | `cc4eedd2-771e-4c49-a701-cd8d52f79422` | **MIGRATED** | N/A |
| `session_sets` | `set_c6` | `5d5119f1-e5a7-49d7-93bc-93e5c534f09f` | **MIGRATED** | N/A |
| `sessions` | `sess_carlos_2` | `c8a923ca-3701-44ad-a9b7-17aa50bdca59` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_c7` | `d1e4b24e-8a47-48b6-8fd1-651da273bd84` | **MIGRATED** | N/A |
| `session_sets` | `set_c8` | `ab751bc4-bfee-47c4-bb15-1010675dfd5a` | **MIGRATED** | N/A |
| `session_sets` | `set_c9` | `8d88926d-b6ba-40dd-b66a-18baf77610d2` | **MIGRATED** | N/A |
| `session_sets` | `set_c10` | `95351887-191c-4874-948b-c579f1ea27a3` | **MIGRATED** | N/A |
| `sessions` | `sess_mariana_1` | `1dd9065a-831c-4a85-ad53-d9b6e37efb90` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_m1` | `7fdc30cc-5e4b-4973-b1dc-cc06c50db190` | **MIGRATED** | N/A |
| `session_sets` | `set_m2` | `0adb656c-3443-43e5-998b-ecdd8b3619a9` | **MIGRATED** | N/A |
| `session_sets` | `set_m3` | `c375d37c-0c57-426a-b376-92aefa972ec5` | **MIGRATED** | N/A |
| `sessions` | `sess_mariana_2` | `0271616c-cfc2-40b6-954f-41d7494c292d` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_m4` | `001635de-c401-4aad-ab73-180a5f1f3a99` | **MIGRATED** | N/A |
| `session_sets` | `set_m5` | `d83056cd-b0bc-4aba-a27d-06876d38b0f9` | **MIGRATED** | N/A |
| `session_sets` | `set_m6` | `1e5df9ad-662f-4192-94ad-4065cdcc2afd` | **MIGRATED** | N/A |
| `sessions` | `sess_rodrigo_1` | `caf72002-074d-41fe-bbc9-0d8ec9c079a2` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_r1` | `699f0e2a-b8e7-49dd-8cc7-2c5e8d34ee54` | **MIGRATED** | N/A |
| `session_sets` | `set_r2` | `d6635d1e-350a-48b7-a073-7fde060fa27d` | **MIGRATED** | N/A |
| `sessions` | `sess_rodrigo_2` | `ce70bff2-4997-4011-8ea2-2265f3f98227` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_r3` | `72bade4f-2429-4889-a472-6998db72c28b` | **MIGRATED** | N/A |
| `session_sets` | `set_r4` | `2acbfbd5-83af-4458-a654-694eebb59acc` | **MIGRATED** | N/A |
| `sessions` | `sess_beatriz_1` | `afe3c24e-4678-4f12-a343-c59e6ded58e8` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_b1` | `340e2cc9-3655-494d-ae33-1fb89ddc598c` | **MIGRATED** | N/A |
| `session_sets` | `set_b2` | `494cdabf-7a25-4002-a517-d303bd5c307d` | **MIGRATED** | N/A |
| `session_sets` | `set_b3` | `bbd57cf4-91ae-4683-893d-d46aa5c92a14` | **MIGRATED** | N/A |
| `sessions` | `sess_beatriz_2` | `5720cb06-c069-432b-b5ce-2536016e5f3b` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_b4` | `72bc5b72-0a4d-4c03-9bc2-d37febd00ba3` | **MIGRATED** | N/A |
| `session_sets` | `set_b5` | `50c65c05-8f15-4758-b133-88168bdd26e7` | **MIGRATED** | N/A |
| `session_sets` | `set_b6` | `9639fa10-7564-467b-bc18-309848ea4673` | **MIGRATED** | N/A |
| `sessions` | `sess_fernando_1` | `8408e822-664c-4a2d-8c2b-72966013f353` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_f1` | `448e90c7-428b-4b92-a615-98a6e8a00ba1` | **MIGRATED** | N/A |
| `session_sets` | `set_f2` | `ddef617e-e1c9-444e-b541-e9eb9347b847` | **MIGRATED** | N/A |
| `sessions` | `sess_fernando_2` | `d66f8a37-7330-42ec-b6d1-c3b76b3218b4` | **MIGRATED** | ✅ MATCH |
| `session_sets` | `set_f3` | `2a231dc4-c4fa-4a75-8a22-27ec2eaba948` | **MIGRATED** | N/A |
| `session_sets` | `set_f4` | `11ea0c6a-6c03-4da9-b97f-12c4b42bfea5` | **MIGRATED** | N/A |
| `assessments` | `asmt_carlos_1` | `78fdae33-1e6a-4a72-902b-5c4cab0dec58` | **MIGRATED** | ✅ MATCH |
| `assessments` | `asmt_mariana_1` | `056106c7-2e44-44e7-9e44-f4b59c468b26` | **MIGRATED** | ✅ MATCH |
| `assessments` | `asmt_rodrigo_1` | `74062152-78f7-4a29-990c-2046ac4c28bf` | **MIGRATED** | ✅ MATCH |
| `assessments` | `asmt_beatriz_1` | `ee5c681c-a55b-4476-a618-67d04ed5c333` | **MIGRATED** | ✅ MATCH |
| `assessments` | `asmt_fernando_1` | `c7f375ec-201e-4141-acc0-c47e9a919772` | **MIGRATED** | ✅ MATCH |
| `schedule_recurrences` | `rec_carlos` | `c3df8976-b8e4-4403-ae40-fc7a51f359ae` | **MIGRATED** | N/A |
| `schedule_recurrences` | `rec_mariana` | `90fae0e8-85a5-4691-a442-a691b7f29577` | **MIGRATED** | N/A |
| `schedule_events` | `evt_carlos_today` | `6f5de993-79a0-42d3-9240-89610d7d4fff` | **MIGRATED** | N/A |
| `schedule_events` | `evt_mariana_today` | `4187fde1-e4a0-469f-9524-4d2c87495230` | **MIGRATED** | N/A |
| `schedule_events` | `evt_rodrigo_today` | `3ff510de-dd16-4c4d-a7cc-19f10017093e` | **MIGRATED** | N/A |
| `schedule_events` | `evt_beatriz_today` | `bf451904-da78-4e5e-8da9-7cf18cc74130` | **MIGRATED** | N/A |
| `schedule_events` | `evt_carlos_next` | `2400883f-f062-4e1a-aed6-8e53fcdb3411` | **MIGRATED** | N/A |
| `training_cycles` | `cyc_carlos_1` | `91584f14-9b49-49fa-849b-72184b159431` | **MIGRATED** | N/A |
| `training_blocks` | `blk_carlos_1` | `577ad6c4-376f-406e-8849-87358580d6a2` | **MIGRATED** | N/A |
| `training_blocks` | `blk_carlos_2` | `4c8a84e0-b3a3-46b6-bba4-d7906531254f` | **MIGRATED** | N/A |
| `training_cycles` | `cyc_mariana_1` | `bfb2ae4d-566e-4c59-bf46-8222b6f6b854` | **MIGRATED** | N/A |
| `training_blocks` | `blk_mariana_1` | `fab3b215-d5f0-4fec-a276-c368cb442d4d` | **MIGRATED** | N/A |
| `training_memories` | `mem_1` | `c4f7eec9-52cd-4cf4-a112-042d1362fcf8` | **MIGRATED** | N/A |
| `training_memories` | `mem_2` | `25f53266-caf1-4184-81d0-b9a31bc69551` | **MIGRATED** | N/A |
| `training_memories` | `mem_3` | `d41c1168-d47a-4f0c-b587-2a95d6e020c3` | **MIGRATED** | N/A |
| `proposals` | `prop_carlos` | `a2fefaa9-6c5d-4d41-82f9-0493f43e6808` | **MIGRATED** | N/A |
| `proposals` | `prop_mariana` | `fcc1356d-a7b4-4f3c-a119-aaff5be8aaa0` | **MIGRATED** | N/A |
| `proposals` | `prop_rodrigo` | `eb5cfc7b-d4b2-4fa3-9d26-7c3ccf4ebbcf` | **MIGRATED** | N/A |
| `active_plans` | `plan_carlos_active` | `6e59e558-2a50-448a-8a58-3eab1d19ff8b` | **MIGRATED** | N/A |
| `plan_participants` | `part_carlos_1` | `fac12581-f5f8-4a9a-bf45-bb4bfac35b02` | **MIGRATED** | N/A |
| `active_plans` | `plan_mariana_active` | `0da88067-279d-4f7f-ab12-3bc3d5ef5c12` | **MIGRATED** | N/A |
| `plan_participants` | `part_mariana_1` | `64d70eaa-b57d-48ea-b46d-9de64e4c346b` | **MIGRATED** | N/A |
| `active_plans` | `plan_rodrigo_pending` | `f748cd6f-9e79-4fa7-b433-a78c0710bb14` | **MIGRATED** | N/A |
| `plan_participants` | `part_rodrigo_1` | `09b68c92-3479-4b13-ae73-ddff14680f6c` | **MIGRATED** | N/A |
| `settings` | `trainer_profile` | `03b66968-5451-4898-905d-7250bf5cdde4` | **MIGRATED** | N/A |
| `settings` | `app_theme` | `9e7d08d8-42f8-4be8-9fbe-4a667313ae85` | **MIGRATED** | N/A |
| `settings` | `workout_defaults` | `defb6123-b51d-47fc-bae4-14fb19339e8e` | **MIGRATED** | N/A |
