/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — TIPOS DE SINCRONIZAÇÃO E DIAGNÓSTICO (V5.0)
 * Supabase PostgreSQL é a única fonte oficial dos dados de negócio.
 */

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'success';

export type SyncEntityType =
  | 'students'
  | 'routines'
  | 'workout_templates'
  | 'proposals'
  | 'proposal_templates'
  | 'training_cycles'
  | 'sessions'
  | 'exercises'
  | 'assessments'
  | 'schedule'
  | 'schedule_recurrences'
  | 'functional_tests'
  | 'functional_assessments'
  | 'functional_goals'
  | 'functional_milestones'
  | 'functional_batteries'
  | 'evolution_reports'
  | 'settings'
  | 'photos'
  | 'active_plans'
  | 'plan_transfers'
  | 'plan_suspensions'
  | 'plan_audit_logs'
  | 'training_memories';

export interface CloudSyncConfig {
  userId: string;
  deviceId: string;
  deviceName: string;
  autoSyncEnabled: boolean;
  syncOnStart: boolean;
  syncOnFinishWorkout: boolean;
  syncOnForeground: boolean;
  syncIntervalSeconds: number;
}

export interface SyncDiagnostic {
  supabaseConnected: boolean;
  cloudSyncActive: boolean;
  organizationId: string;
  userAuthenticated: boolean;
  userUid: string;
  userEmail: string;
  deviceId: string;
  deviceName: string;
  lastPushAt: string | null;
  lastPushCount: number;
  lastPullAt: string | null;
  lastPullCount: number;
  pendingQueueCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  isOnline: boolean;
  syncEngineMode: 'supabase' | 'offline';
}

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  changesApplied: number;
  error?: string;
  message?: string;
}
