/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSession } from '../../types';

export interface ISessionRepository {
  getAll(organizationId?: string): Promise<WorkoutSession[]>;
  getByStudentId(studentId: string): Promise<WorkoutSession[]>;
  getById(id: string): Promise<WorkoutSession | null>;
  create(session: WorkoutSession): Promise<WorkoutSession>;
  update(id: string, patch: Partial<WorkoutSession>): Promise<WorkoutSession>;
  delete(id: string): Promise<void>;
}
