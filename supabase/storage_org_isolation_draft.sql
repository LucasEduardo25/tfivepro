-- TFIVE PRO — DRAFT ONLY: organization-scoped Storage policies
-- This file is intentionally NOT an active migration.
-- Do not execute until all existing objects have been inventoried and moved into
-- the required folder layout, and the app has been updated to store storage:// references.
--
-- Required object paths:
-- organization-assets: {organization_uuid}/{filename}
-- student-avatars:     {organization_uuid}/{student_uuid}/{filename}
-- assessment-photos:   {organization_uuid}/{student_uuid}/{assessment_uuid}/{filename}
--
-- The application currently stores legacy data URLs in database fields/IndexedDB.
-- Enabling these policies before migrating legacy data will make old object paths
-- inaccessible. Bucket visibility and legacy policies are deliberately unchanged
-- by this draft.

begin;

-- Private buckets prevent anonymous direct downloads. The app must use signed URLs.
update storage.buckets
set public = false
where id in ('organization-assets', 'student-avatars', 'assessment-photos');

-- Remove the previously identified cross-organization/public policies.
drop policy if exists "TFIVE trainers read own organization assets" on storage.objects;
drop policy if exists "TFIVE trainers insert own organization assets" on storage.objects;
drop policy if exists "TFIVE trainers update own organization assets" on storage.objects;
drop policy if exists "TFIVE trainers delete own organization assets" on storage.objects;
drop policy if exists "TFIVE read organization student avatars" on storage.objects;
drop policy if exists "TFIVE trainers insert organization student avatars" on storage.objects;
drop policy if exists "TFIVE trainers update organization student avatars" on storage.objects;
drop policy if exists "TFIVE trainers delete organization student avatars" on storage.objects;
drop policy if exists "TFIVE read organization assessment photos" on storage.objects;
drop policy if exists "TFIVE trainers insert organization assessment photos" on storage.objects;
drop policy if exists "TFIVE trainers update organization assessment photos" on storage.objects;
drop policy if exists "TFIVE trainers delete organization assessment photos" on storage.objects;
drop policy if exists "Public read for organization assets" on storage.objects;
drop policy if exists "Public read for student avatars" on storage.objects;
drop policy if exists "Trainers manage assessment photos" on storage.objects;
drop policy if exists "Trainers manage organization assets" on storage.objects;
drop policy if exists "Trainers manage student avatars" on storage.objects;

-- Organization assets: trainers can manage files only inside their own organization.
create policy "TFIVE trainers read own organization assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'organization-assets'
  and (storage.foldername(name))[1] is not null
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "TFIVE trainers insert own organization assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'organization-assets'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "TFIVE trainers update own organization assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'organization-assets'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
)
with check (
  bucket_id = 'organization-assets'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "TFIVE trainers delete own organization assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'organization-assets'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

-- Student avatars: trainers manage their organization; a student may read only
-- their own avatar when student_access authorizes that exact student UUID.
create policy "TFIVE read organization student avatars"
on storage.objects for select to authenticated
using (
  bucket_id = 'student-avatars'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then (
      public.is_trainer(((storage.foldername(name))[1])::uuid)
      or (
        (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$'
        and public.is_authorized_student(
          ((storage.foldername(name))[1])::uuid,
          ((storage.foldername(name))[2])::uuid
        )
      )
    )
    else false
  end
);

create policy "TFIVE trainers insert organization student avatars"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'student-avatars'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "TFIVE trainers update organization student avatars"
on storage.objects for update to authenticated
using (
  bucket_id = 'student-avatars'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
)
with check (
  bucket_id = 'student-avatars'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "TFIVE trainers delete organization student avatars"
on storage.objects for delete to authenticated
using (
  bucket_id = 'student-avatars'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

-- Assessment photos are private. Trainers manage files in their organization;
-- students can read only their own assessment-photo folder.
create policy "TFIVE read organization assessment photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'assessment-photos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then (
      public.is_trainer(((storage.foldername(name))[1])::uuid)
      or (
        (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$'
        and public.is_authorized_student(
          ((storage.foldername(name))[1])::uuid,
          ((storage.foldername(name))[2])::uuid
        )
      )
    )
    else false
  end
);

create policy "TFIVE trainers insert organization assessment photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'assessment-photos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "TFIVE trainers update organization assessment photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'assessment-photos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
)
with check (
  bucket_id = 'assessment-photos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "TFIVE trainers delete organization assessment photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'assessment-photos'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_trainer(((storage.foldername(name))[1])::uuid)
    else false
  end
);

commit;
