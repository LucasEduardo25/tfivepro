-- =============================================================================
-- TFIVE PRO — SaaS: provisionamento automático do espaço de trabalho
-- Cada novo cadastro de treinador cria:
--   1. profiles
--   2. organizations
--   3. organization_members com role OWNER
--   4. app_users para compatibilidade com o modelo operacional legado
--
-- A função só provisiona um workspace quando organization_name foi enviado
-- no metadata do Supabase Auth. Cadastros de alunos não recebem workspace.
-- =============================================================================

create or replace function public.handle_new_trainer_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_organization_name text;
  v_slug_base text;
  v_slug text;
  v_organization_id uuid := pg_catalog.gen_random_uuid();
begin
  v_organization_name := nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), '');

  -- Alunos e demais contas sem organization_name não recebem uma organização.
  if v_organization_name is null then
    return new;
  end if;

  v_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Treinador'
  );

  v_slug_base := btrim(
    regexp_replace(lower(v_organization_name), '[^a-z0-9]+', '-', 'g'),
    '-'
  );

  if v_slug_base = '' then
    v_slug_base := 'workspace';
  end if;

  -- Sufixo derivado do UUID evita colisões entre nomes iguais.
  v_slug := left(v_slug_base, 48) || '-' ||
            left(replace(v_organization_id::text, '-', ''), 8);

  insert into public.profiles (id, full_name, email)
  values (new.id, v_full_name, new.email)
  on conflict (id) do nothing;

  insert into public.organizations (id, name, slug)
  values (v_organization_id, v_organization_name, v_slug);

  insert into public.organization_members (
    organization_id, user_id, role, status
  )
  values (
    v_organization_id, new.id, 'OWNER', 'active'
  );

  insert into public.app_users (
    organization_id, auth_uid, role, status, email, display_name
  )
  values (
    v_organization_id, new.id::text, 'TRAINER', 'active', new.email, v_full_name
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_trainer_signup() from public, anon, authenticated;

drop trigger if exists tfive_create_trainer_workspace on auth.users;

create trigger tfive_create_trainer_workspace
after insert on auth.users
for each row
execute function public.handle_new_trainer_signup();
