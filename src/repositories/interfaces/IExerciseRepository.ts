/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exercise } from '../../types';

export interface IExerciseRepository {
  getAll(organizationId?: string): Promise<Exercise[]>;
  getById(id: string): Promise<Exercise | null>;
  create(exercise: Exercise): Promise<Exercise>;
  update(id: string, patch: Partial<Exercise>): Promise<Exercise>;
  delete(id: string): Promise<void>;
}
