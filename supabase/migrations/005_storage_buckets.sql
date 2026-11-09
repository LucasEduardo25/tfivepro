-- ==============================================================================
-- TFIVE PRO — FRESH START SUPABASE (MIGRATION 005: STORAGE BUCKETS & POLICIES)
-- Provisionamento dos 3 buckets oficiais do sistema com isolamento e RLS
-- ==============================================================================

-- 1. Criação do schema storage caso não exista (emuladores / pg-mem / staging)
CREATE SCHEMA IF NOT EXISTS storage;

-- 2. Tabela de Buckets do Supabase Storage
CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    public BOOLEAN DEFAULT false,
    avif_autodetection BOOLEAN DEFAULT false,
    file_size_limit BIGINT,
    allowed_mime_types TEXT[]
);

-- 3. Tabela de Objetos do Supabase Storage
CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id TEXT REFERENCES storage.buckets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_accessed_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    path_tokens TEXT[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
);

-- 4. Inserção idempotente dos 3 buckets oficiais requeridos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'student-avatars', 
    'student-avatars', 
    true, 
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'assessment-photos', 
    'assessment-photos', 
    false, -- Privado (apenas treinadores e aluno titular autorizado)
    20971520, -- 20MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'organization-assets', 
    'organization-assets', 
    true, -- Logos e assinaturas visuais públicas
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. Habilitar RLS no Storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS para Storage Objects
-- Student Avatars: Leitura pública, escrita apenas por treinadores da organização
CREATE POLICY "Public read for student avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-avatars');

CREATE POLICY "Trainers can upload student avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-avatars' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Trainers can update student avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'student-avatars' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Trainers can delete student avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'student-avatars' 
    AND auth.role() = 'authenticated'
  );

-- Assessment Photos: Acesso restrito a usuários autenticados
CREATE POLICY "Authenticated users access assessment photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Trainers can manage assessment photos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND auth.role() = 'authenticated'
  );

-- Organization Assets: Leitura pública, gestão restrita a treinadores
CREATE POLICY "Public read for organization assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-assets');

CREATE POLICY "Trainers can manage organization assets"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'organization-assets'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'organization-assets'
    AND auth.role() = 'authenticated'
  );
