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


-- Google OAuth não permite enviar user_metadata customizado no signInWithOAuth.
-- Este RPC conclui o onboarding após o retorno do Google, validando auth.uid().
create or replace function public.provision_google_trainer_workspace(
  p_organization_name text,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_org_name text := nullif(btrim(p_organization_name), '');
  v_slug_base text;
  v_slug text;
  v_org_id uuid := pg_catalog.gen_random_uuid();
  v_existing_org uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if v_org_name is null then
    raise exception 'Informe o nome do espaço de trabalho.';
  end if;

  if char_length(v_org_name) > 80 then
    raise exception 'O nome do espaço de trabalho deve ter no máximo 80 caracteres.';
  end if;

  -- Uma conta vinculada como aluno não pode se promover a treinador.
  if exists (
    select 1
    from public.student_access sa
    where sa.user_id = v_user_id
  ) then
    raise exception 'Esta conta já está vinculada como aluno.';
  end if;

  -- Operação idempotente: não cria uma segunda organização para o mesmo usuário.
  select om.organization_id
    into v_existing_org
  from public.organization_members om
  where om.user_id = v_user_id
    and om.status = 'active'
    and om.role in ('OWNER', 'TRAINER')
  order by om.created_at
  limit 1;

  if v_existing_org is not null then
    return v_existing_org;
  end if;

  if exists (
    select 1
    from public.organization_members om
    where om.user_id = v_user_id
  ) then
    raise exception 'Esta conta já possui um vínculo que não permite criar um workspace de treinador.';
  end if;

  select
    u.email,
    coalesce(
      nullif(btrim(p_full_name), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Treinador'
    )
  into v_email, v_full_name
  from auth.users u
  where u.id = v_user_id;

  if not found then
    raise exception 'Usuário autenticado não foi encontrado.';
  end if;

  v_slug_base := btrim(
    regexp_replace(lower(v_org_name), '[^a-z0-9]+', '-', 'g'),
    '-'
  );
  if v_slug_base = '' then
    v_slug_base := 'workspace';
  end if;
  v_slug := left(v_slug_base, 48) || '-' ||
            left(replace(v_org_id::text, '-', ''), 8);

  insert into public.profiles (id, full_name, email)
  values (v_user_id, v_full_name, v_email)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = coalesce(excluded.email, public.profiles.email);

  insert into public.organizations (id, name, slug)
  values (v_org_id, v_org_name, v_slug);

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org_id, v_user_id, 'OWNER', 'active');

  insert into public.app_users (
    organization_id, auth_uid, role, status, email, display_name
  )
  values (
    v_org_id, v_user_id::text, 'TRAINER', 'active', v_email, v_full_name
  )
  on conflict do nothing;

  return v_org_id;
end;
$$;

revoke all on function public.provision_google_trainer_workspace(text, text) from public, anon;
grant execute on function public.provision_google_trainer_workspace(text, text) to authenticated;
