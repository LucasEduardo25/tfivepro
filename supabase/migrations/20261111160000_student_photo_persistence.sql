-- Persistência de fotos de evolução dos alunos no PostgreSQL.
-- Idempotente: preserva a tabela e os registros existentes no STAGING.
create table if not exists public.student_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  photo_reference text not null check (length(trim(photo_reference)) > 0),
  category text not null check (category in ('Frente', 'Lateral direita', 'Lateral esquerda', 'Costas', 'Outro')),
  photo_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_photos_org_student_date_idx
  on public.student_photos (organization_id, student_id, photo_date desc);

alter table public.student_photos enable row level security;

grant select, insert, update, delete on public.student_photos to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_photos'
      and policyname = 'Trainers manage organization student photos'
  ) then
    create policy "Trainers manage organization student photos"
      on public.student_photos
      for all to authenticated
      using (public.is_trainer(organization_id))
      with check (public.is_trainer(organization_id));
  end if;
end
$$;
