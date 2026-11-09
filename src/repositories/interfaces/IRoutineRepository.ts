/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutRoutine } from '../../types';

export interface IRoutineRepository {
  getAll(organizationId?: string): Promise<WorkoutRoutine[]>;
  getByStudentId(studentId: string): Promise<WorkoutRoutine[]>;
  getById(id: string): Promise<WorkoutRoutine | null>;
  create(routine: WorkoutRoutine): Promise<WorkoutRoutine>;
  update(id: string, patch: Partial<WorkoutRoutine>): Promise<WorkoutRoutine>;
  delete(id: string): Promise<void>;
}
