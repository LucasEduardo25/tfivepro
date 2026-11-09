/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActivePlan, PlanSuspension, PlanTransfer, PlanAuditLog } from '../../types/activePlan';

export interface IActivePlanRepository {
  getAll(): Promise<ActivePlan[]>;
  getById(id: string): Promise<ActivePlan | null>;
  getByStudentId(studentId: string): Promise<ActivePlan[]>;
  save(plan: ActivePlan): Promise<ActivePlan>;
  delete(id: string): Promise<void>;
  getSuspensions(planId: string): Promise<PlanSuspension[]>;
  saveSuspension(suspension: PlanSuspension): Promise<PlanSuspension>;
  getTransfers(planId: string): Promise<PlanTransfer[]>;
  saveTransfer(transfer: PlanTransfer): Promise<PlanTransfer>;
  getAuditLogs(planId: string): Promise<PlanAuditLog[]>;
  recordAuditLog(log: PlanAuditLog): Promise<PlanAuditLog>;
}
