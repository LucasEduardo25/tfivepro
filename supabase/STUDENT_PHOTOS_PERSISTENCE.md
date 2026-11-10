# Student evolution photo persistence — rollout draft

## Current verified behavior

- The evolution gallery writes metadata and image data URLs through `AppContext.savePhoto`.
- `savePhoto` only updates React state; it does not write to Supabase or IndexedDB.
- `refreshData` does not load photos from a repository.
- Consequently, evolution photos are not durable across sign-outs/devices in the SaaS flow.
- O repositório de alunos converte fotos de perfil data URL em uploads no bucket privado `student-avatars` e resolve referências `storage://` em URLs assinadas.
- O Storage service está conectado à galeria de fotos de evolução. O seletor de foto do perfil e o fluxo de fotos de avaliação física ainda usam seus caminhos antigos e exigem integração separada.

## Proposed persistence contract

- Store binary images in the private `assessment-photos` bucket using organization/student/assessment folder scoping. For evolution photos, use a dedicated prefix beneath the same student folder or introduce a dedicated bucket after review.
- Store only a `storage://bucket/path` reference in `student_photos.photo_reference`; never persist signed URLs.
- Store metadata in `public.student_photos`: organization UUID, student UUID, category, date, notes, timestamps.
- Resolve short-lived signed URLs when presenting images. Keep legacy data URLs readable during migration.
- Do not delete old data URLs or source objects until migration and cross-account verification pass.

## Database draft

`STUDENT_PHOTOS_PERSISTENCE_DRAFT.sql` proposes the metadata table and trainer-only RLS. It is not an active migration and has not been executed. Student self-access is outside the current product scope; only trainer accounts may read these files.

## Required before rollout

1. Verify the exact `organizations` and `students` foreign-key definitions in the target schema.
2. Apply this schema only to an isolated Supabase staging project.
3. O repositório Supabase já foi implementado e registrado em `repositoryConfig`; `refreshData` e `reloadDataSilently` carregam as fotos, enquanto `savePhoto/deletePhoto` persistem no servidor.
4. O fluxo da galeria já faz upload para Storage e resolução de URLs assinadas; a gravação falha com mensagem explícita enquanto a migration e as policies não estiverem instaladas.
5. Validar separadamente o ciclo de vida das fotos de perfil e das fotos de avaliação física, incluindo edição, remoção e migração de data URLs existentes.
6. Test with two trainer accounts and an account without an active trainer membership; confirm cross-organization reads, writes, deletes, and signed URL generation are denied.
7. Only then plan migration/rollout to the shared Supabase project with backup and explicit approval.

## Status

No SQL has been executed. No Storage policies or buckets have been changed. Production is untouched.
