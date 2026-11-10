-- TFIVE PRO: hardened trainer onboarding.
-- Workspaces are provisioned only through an authenticated RPC after email verification.
-- A pending or active student invitation takes precedence over trainer self-registration.

create or replace function public.handle_new_trainer_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuário'
  );

  -- Auth metadata is user-controlled. Never grant OWNER/TRAINER privileges from
  -- an auth.users insert trigger. The authenticated onboarding RPC does that later.
  insert into public.profiles (id, full_name, email)
  values (new.id, v_full_name, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_trainer_signup() from public, anon, authenticated;

drop trigger if exists tfive_create_trainer_workspace on auth.users;

create trigger tfive_create_trainer_workspace
after insert on auth.users
for each row
execute function public.handle_new_trainer_signup();


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
  v_email_confirmed_at timestamptz;
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

  -- Serializa callbacks simultâneos para evitar workspaces duplicados.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select
    u.email,
    u.email_confirmed_at,
    coalesce(
      nullif(btrim(p_full_name), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Treinador'
    )
  into v_email, v_email_confirmed_at, v_full_name
  from auth.users u
  where u.id = v_user_id;

  if not found then
    raise exception 'Usuário autenticado não foi encontrado.';
  end if;

  if v_email_confirmed_at is null then
    raise exception 'Confirme seu e-mail antes de criar o espaço de trabalho.';
  end if;

  -- Idempotência: uma organização já existente permanece vinculada ao treinador.
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

  -- A conta não pode se promover quando já existe vínculo ou convite de aluno.
  -- A verificação por e-mail cobre convites ainda não associados a auth.users.
  if exists (
    select 1
    from public.student_access sa
    where sa.user_id = v_user_id
       or (
         v_email is not null
         and nullif(btrim(sa.invited_email), '') is not null
         and lower(btrim(sa.invited_email)) = lower(btrim(v_email))
       )
  ) then
    return null;
  end if;

  if exists (
    select 1
    from public.organization_members om
    where om.user_id = v_user_id
  ) then
    raise exception 'Esta conta já possui um vínculo que não permite criar um workspace de treinador.';
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

revoke all on function public.provision_google_trainer_workspace(text, text)
  from public, anon, authenticated;
grant execute on function public.provision_google_trainer_workspace(text, text)
  to authenticated;
