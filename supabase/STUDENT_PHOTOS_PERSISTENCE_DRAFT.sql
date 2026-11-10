-- DRAFT ONLY — DO NOT EXECUTE against the shared preview/production Supabase project.
-- Student evolution photo metadata. Binary files remain in private Supabase Storage.
-- Requires organization-scoped Storage policies and UUID-based student IDs.

create table if not exists public.student_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  photo_reference text not null,
  category text not null check (
    category in ('Frente', 'Lateral direita', 'Lateral esquerda', 'Costas', 'Outro')
  ),
  photo_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_photos_reference_not_empty check (length(trim(photo_reference)) > 0)
);

create index if not exists student_photos_org_student_date_idx
  on public.student_photos (organization_id, student_id, photo_date desc);

alter table public.student_photos enable row level security;

drop policy if exists "Trainers manage organization student photos" on public.student_photos;
drop policy if exists "Students read own evolution photos" on public.student_photos;

create policy "Trainers manage organization student photos"
  on public.student_photos
  for all
  to authenticated
  using (public.is_trainer(organization_id))
  with check (public.is_trainer(organization_id));

-- Student self-access is not part of the current product scope.
-- Only the trainer's organization-scoped policies are created here.
-- from the initial rollout until that product decision is made.

grant select, insert, update, delete on public.student_photos to authenticated;
