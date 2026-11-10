# Student evolution photo persistence — rollout draft

## Current verified behavior

- The evolution gallery writes metadata and image data URLs through `AppContext.savePhoto`.
- `savePhoto` only updates React state; it does not write to Supabase or IndexedDB.
- `refreshData` does not load photos from a repository.
- Consequently, evolution photos are not durable across sign-outs/devices in the SaaS flow.
- Student profile photos are currently written into `students.photo_url` as supplied, which can be a large data URL.
- The Storage service exists but is not yet called by the photo gallery, profile picker, or assessment flow.

## Proposed persistence contract

- Store binary images in the private `assessment-photos` bucket using organization/student/assessment folder scoping. For evolution photos, use a dedicated prefix beneath the same student folder or introduce a dedicated bucket after review.
- Store only a `storage://bucket/path` reference in `student_photos.photo_reference`; never persist signed URLs.
- Store metadata in `public.student_photos`: organization UUID, student UUID, category, date, notes, timestamps.
- Resolve short-lived signed URLs when presenting images. Keep legacy data URLs readable during migration.
- Do not delete old data URLs or source objects until migration and cross-account verification pass.

## Database draft

`STUDENT_PHOTOS_PERSISTENCE_DRAFT.sql` proposes the metadata table and trainer-only RLS. It is not an active migration and has not been executed. Student self-read is deliberately not enabled until the product access decision is explicit.

## Required before rollout

1. Verify the exact `organizations` and `students` foreign-key definitions in the target schema.
2. Apply this schema only to an isolated Supabase staging project.
3. Implement a Supabase repository and include it in `refreshData` and `savePhoto/deletePhoto`.
4. Integrate upload and signed-URL resolution into the evolution gallery.
5. Integrate profile and physical-assessment image flows separately; do not assume they share the same identifiers or lifecycle.
6. Test with two trainer accounts and a student account; confirm cross-organization reads, writes, deletes, and signed URL generation are denied.
7. Only then plan migration/rollout to the shared Supabase project with backup and explicit approval.

## Status

No SQL has been executed. No Storage policies or buckets have been changed. Production is untouched.
