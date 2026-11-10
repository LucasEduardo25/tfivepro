# TFIVE PRO — Staging rollout

Updated: 2026-11-10

## Environment

- Supabase staging project: `TFIVE-STAGING`
- Project ref: `caddmnsuxowdudocqiqv`
- Region: `sa-east-1`
- Project URL: `https://caddmnsuxowdudocqiqv.supabase.co`
- Netlify site: `tfivepro`
- Preview branch: `feat/saas-onboarding-isolation`
- Preview URL: `https://deploy-preview-11--tfivepro.netlify.app/`

The Netlify `deploy-preview` context is configured with the staging `VITE_SUPABASE_URL` and publishable key. Production-context variables were not changed.

## Database rollout applied to staging only

Applied the core schema and supporting changes:

- `001_initial_schema`
- `002_rls`
- `003_indexes`
- `004_missing_domains`
- `006_relax_student_gender_constraint`
- `007_student_modality_and_rls`
- `008_student_access_invite_columns`
- `009_student_ai_summary_expanded`
- `010_student_ai_summary_redaction`
- `011_saas_trainer_signup`
- `012_student_photos_and_storage_gate`
- `013_storage_organization_isolation`
- `014_harden_rls_helper_functions`
- `005_storage_bucket_metadata`

The managed Supabase `storage` schema already exists and is owned by Supabase's storage service. The repository's original `005_storage_buckets.sql` attempts to create managed `storage` tables and is not suitable for a hosted Supabase project. Staging buckets were provisioned by inserting metadata into the existing managed `storage.buckets` table instead.

## Storage buckets

All three buckets are private:

| Bucket | Max size | Allowed MIME types |
| --- | ---: | --- |
| `student-avatars` | 5 MB | JPEG, PNG, WebP, GIF |
| `assessment-photos` | 20 MB | JPEG, PNG, WebP |
| `organization-assets` | 10 MB | JPEG, PNG, WebP, SVG |

Organization-scoped policies are installed on `storage.objects`. Object paths must begin with the organization UUID. Student and assessment photo paths also include the student UUID. The storage activation marker is enabled only after the policies are installed.

The `student_photos` metadata table is installed with trainer-only RLS. Student self-access to evolution photos is intentionally not enabled.

## Verification performed

- Staging project reports `ACTIVE_HEALTHY`.
- Required three buckets exist and are private.
- 12 organization-scoped Storage policies exist.
- Storage activation marker is enabled.
- `student_photos` table exists.
- All public tables in staging have RLS enabled.
- The staging security advisor no longer reports anonymous access to the RLS helper SECURITY DEFINER functions.
- Remaining authenticated SECURITY DEFINER warnings are expected for RLS helpers and the authenticated Google-workspace provisioning RPC; they should remain under review.
- No real two-user JWT isolation test or live upload/download test has been completed yet.

The two seed-import helper tables `_seed_dict` and `_seed_raw` present in production were not recreated; they are not part of the application schema. No production data was copied.

## Google OAuth — final manual provider step

The Supabase MCP connection used for this rollout does not expose Auth provider configuration. Complete these steps in the dashboards; do not share the Google client secret in chat:

1. In Google Cloud Console → Google Auth Platform → Clients, open the existing TFIVE PRO Web OAuth client.
2. Add this Authorized redirect URI:
   `https://caddmnsuxowdudocqiqv.supabase.co/auth/v1/callback`
3. Keep the existing Authorized JavaScript origins for the TFIVE PRO site and preview.
4. In Supabase Dashboard for project `caddmnsuxowdudocqiqv` → Authentication → Providers → Google, enable Google and enter the same Web Client ID and Client Secret already used by the production TFIVE project.
5. In Authentication → URL Configuration, set the Site URL to:
   `https://deploy-preview-11--tfivepro.netlify.app`
6. Add this Redirect URL:
   `https://deploy-preview-11--tfivepro.netlify.app/**`

Do not add the staging callback to production's Google provider settings or change production Auth settings.

## Safety boundaries

- All schema, Storage bucket, and Storage policy changes above were applied only to `TFIVE-STAGING`.
- Production project `TFIVE` was not modified.
- `CONTROLE` remains paused, not deleted.
- PR #11 remains unmerged. Do not merge or publish to production until staging validation and explicit approval are complete.
