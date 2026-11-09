/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — SUPABASE CLIENT (HOMOLOGAÇÃO / STAGING)
 * Cliente tipado com suporte a fallbacks seguros e isolamento contra crash de startup.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const rawUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
const rawKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(rawUrl && rawKey && rawUrl.startsWith('https://') && rawKey.length > 20);
};

// Configuração segura com fallback para evitar crash em compilação ou sem chaves injetadas
const supabaseUrl = isSupabaseConfigured() ? rawUrl : 'https://staging-placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured() ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'tfive_supabase_auth_v1',
  },
});

export const getSupabaseClient = (): SupabaseClient<Database> => supabase;
