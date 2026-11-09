-- ==============================================================================
-- TFIVE PRO — BOOTSTRAP DO PRIMEIRO OWNER REAL
-- ==============================================================================
-- Este script provisiona administrativamente a primeira Organização e vincula
-- o primeiro usuário real (OWNER) no Supabase, de forma 100% segura e compatível
-- com o RLS ativo, sem backdoors no frontend nem permissões públicas indevidas.
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Certifique-se de que o usuário foi criado no Supabase Auth:
--    Menu: Authentication -> Users -> Add user -> Create user
--    E-mail cadastrado: lucaseduardo5465@gmail.com
-- 2. Execute este script no SQL Editor do Supabase.
-- 3. Comportamento FAIL-CLOSED: se o e-mail não existir em auth.users, o script
--    falha imediatamente com RAISE EXCEPTION e não seleciona nenhum outro usuário.
-- ==============================================================================

DO $$
DECLARE
  -- E-mail do usuário real criado em Authentication -> Users
  v_target_email TEXT := 'lucaseduardo5465@gmail.com';
  
  v_user_id UUID;
  v_user_full_name TEXT;
  v_org_id UUID := '00000000-0000-4000-a000-000000000001'; -- UUID Canônico TFIVE PRO
  v_org_name TEXT := 'TFIVE PRO';
  v_org_slug TEXT := 'tfive-pro';
BEGIN
  -- 1. Localizar o usuário real no Supabase Auth (auth.users)
  SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Proprietário TFIVE PRO')
  INTO v_user_id, v_user_full_name
  FROM auth.users
  WHERE LOWER(email) = LOWER(v_target_email)
  LIMIT 1;

  -- Validação FAIL-CLOSED estrita: se não encontrar o e-mail exato, aborta imediatamente
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'ERRO: O usuário com e-mail % não foi encontrado em auth.users.',
      v_target_email;
  END IF;

  RAISE NOTICE 'Usuário localizado no Auth: ID = %, Email = %', v_user_id, v_target_email;

  -- 2. Criar ou atualizar a Organization TFIVE PRO
  INSERT INTO public.organizations (id, name, slug, created_at, updated_at)
  VALUES (v_org_id, v_org_name, v_org_slug, now(), now())
  ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name, 
        slug = EXCLUDED.slug,
        updated_at = now();

  RAISE NOTICE 'Organização provisionada: ID = %, Nome = %', v_org_id, v_org_name;

  -- 3. Criar ou atualizar o Profile do OWNER vinculado a auth.users.id
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (v_user_id, v_user_full_name, v_target_email, now(), now())
  ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = now();

  RAISE NOTICE 'Profile provisionado: ID = %, Nome = %', v_user_id, v_user_full_name;

  -- 4. Criar ou atualizar o Membership como 'OWNER' com status 'active'
  -- Validado contra a constraint CHECK (role IN ('OWNER', 'TRAINER', 'STUDENT'))
  -- Esta é a fonte canônica de permissão e RLS (is_trainer() aceita OWNER e TRAINER)
  INSERT INTO public.organization_members (organization_id, user_id, role, status, created_at, updated_at)
  VALUES (v_org_id, v_user_id, 'OWNER', 'active', now(), now())
  ON CONFLICT (organization_id, user_id) DO UPDATE 
    SET role = 'OWNER',
        status = 'active',
        updated_at = now();

  RAISE NOTICE 'Membership OWNER provisionado para Organization % e User %', v_org_id, v_user_id;

  -- 5. Compatibilidade adicional com public.app_users (armazenamento legado de persona)
  -- Nota de auditoria: a tabela app_users possui constraint CHECK (role IN ('TRAINER', 'STUDENT')).
  -- Portanto, o papel de persona operacional é 'TRAINER', enquanto a permissão administrativa
  -- e controle de acesso real residem em organization_members.role = 'OWNER'.
  INSERT INTO public.app_users (organization_id, auth_uid, role, status, email, display_name, created_at, updated_at)
  VALUES (v_org_id, v_user_id::text, 'TRAINER', 'active', v_target_email, v_user_full_name, now(), now())
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TFIVE PRO — PRIMEIRO OWNER PROVISIONADO COM SUCESSO!';
  RAISE NOTICE 'Organization ID: %', v_org_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Email: %', v_target_email;
  RAISE NOTICE 'Role: OWNER (status: active)';
  RAISE NOTICE '==================================================';
END $$;
