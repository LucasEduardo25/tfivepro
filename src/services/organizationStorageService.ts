import { authService } from './authService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type OrganizationImageKind = 'organization-asset' | 'student-avatar' | 'assessment-photo';

export interface OrganizationImageUploadOptions {
  kind: OrganizationImageKind;
  studentId?: string;
  assessmentId?: string;
  cacheControl?: string;
}

export interface OrganizationImageUploadResult {
  reference: string;
  signedUrl: string;
  bucket: string;
  path: string;
}

const BUCKET_BY_KIND: Record<OrganizationImageKind, string> = {
  'organization-asset': 'organization-assets',
  'student-avatar': 'student-avatars',
  'assessment-photo': 'assessment-photos',
};

const MAX_IMAGE_BYTES_BY_BUCKET: Record<string, number> = {\n  'organization-assets': 10 * 1024 * 1024,\n  'student-avatars': 5 * 1024 * 1024,\n  'assessment-photos': 20 * 1024 * 1024,\n};
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const extensionFor = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    default: throw new Error('Formato de imagem não permitido. Use JPG, PNG ou WEBP.');
  }
};

const assertConfigured = (): void => {
  if (!isSupabaseConfigured()) throw new Error('Supabase Storage não está configurado.');
};

const getOrganizationScope = (): { organizationId: string; role: string; studentId?: string } => {
  const user = authService.getAuthState().user;
  if (!user?.organizationId || !isUuid(user.organizationId)) {
    throw new Error('Organização inválida ou sessão não autenticada.');
  }
  return { organizationId: user.organizationId, role: user.role, studentId: user.studentId };
};

const assertTrainer = (): { organizationId: string } => {
  const scope = getOrganizationScope();
  authService.assertTrainer('gerenciar arquivos da organização');
  return { organizationId: scope.organizationId };
};

const parseReference = (reference: string): { bucket: string; path: string } => {
  if (!reference.startsWith('storage://')) throw new Error('Referência de arquivo inválida.');
  const separator = reference.indexOf('/', 'storage://'.length);
  if (separator < 0) throw new Error('Referência de arquivo inválida.');
  const bucket = reference.slice('storage://'.length, separator);
  const path = reference.slice(separator + 1);
  if (!Object.values(BUCKET_BY_KIND).includes(bucket) || !path || path.startsWith('/') || path.includes('..')) {
    throw new Error('Referência de arquivo inválida.');
  }
  return { bucket, path };
};

const buildPath = (options: OrganizationImageUploadOptions, extension: string): string => {
  const { organizationId } = assertTrainer();
  const fileName = `${crypto.randomUUID()}.${extension}`;

  if (options.kind === 'organization-asset') return `${organizationId}/${fileName}`;

  if (!options.studentId || !isUuid(options.studentId)) {
    throw new Error('O UUID do aluno é obrigatório para este tipo de imagem.');
  }

  if (options.kind === 'student-avatar') {
    return `${organizationId}/${options.studentId}/${fileName}`;
  }

  if (!options.assessmentId || !isUuid(options.assessmentId)) {
    throw new Error('O UUID da avaliação é obrigatório para fotos de avaliação.');
  }

  return `${organizationId}/${options.studentId}/${options.assessmentId}/${fileName}`;
};

/**
 * Uploads images into organization-scoped paths.
 * The corresponding Storage RLS draft must be deployed before this function is used.
 */
export async function uploadOrganizationImage(
  file: File | Blob,
  options: OrganizationImageUploadOptions,
): Promise<OrganizationImageUploadResult> {
  assertConfigured();
  const { organizationId } = assertTrainer();

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Formato de imagem não permitido. Use JPG, PNG ou WEBP.');
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('A imagem deve ter até 20 MB.');
  }

  const bucket = BUCKET_BY_KIND[options.kind];
  const path = buildPath(options, extensionFor(file.type));
  if (path.split('/')[0] !== organizationId) {
    throw new Error('Tentativa de gravar arquivo fora da organização autenticada.');
  }

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: options.cacheControl || '3600',
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const reference = `storage://${bucket}/${path}`;
  const signedUrl = await getOrganizationImageUrl(reference);
  return { reference, signedUrl, bucket, path };
}

/**
 * Returns a short-lived URL only after checking that the reference belongs
 * to the authenticated user's organization (or the student's own folder).
 */
export async function getOrganizationImageUrl(
  reference: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  assertConfigured();
  const { bucket, path } = parseReference(reference);
  const scope = getOrganizationScope();
  const segments = path.split('/');
  const pathOrganizationId = segments[0];

  if (pathOrganizationId !== scope.organizationId) {
    throw new Error('Acesso negado: arquivo pertence a outra organização.');
  }

  if (scope.role === 'STUDENT') {
    if (bucket === 'organization-assets' || !scope.studentId || segments[1] !== scope.studentId) {
      throw new Error('Acesso negado: aluno não pode acessar este arquivo.');
    }
  } else {
    authService.assertTrainer('visualizar arquivos da organização');
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Não foi possível gerar o link temporário da imagem.');
  return data.signedUrl;
}

/** Deletes only files in the current trainer's organization. */
export async function deleteOrganizationImage(reference: string): Promise<void> {
  assertConfigured();
  const { organizationId } = assertTrainer();
  const { bucket, path } = parseReference(reference);

  if (path.split('/')[0] !== organizationId) {
    throw new Error('Acesso negado: não é permitido excluir arquivos de outra organização.');
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/** Converts a data URL to a Blob for controlled legacy-image migration. */
export function dataUrlToImageBlob(dataUrl: string): Blob {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) throw new Error('Imagem legada inválida ou em formato não suportado.');

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1].toLowerCase() });
}

export function isOrganizationStorageReference(value?: string | null): boolean {
  return Boolean(value?.startsWith('storage://'));
}
