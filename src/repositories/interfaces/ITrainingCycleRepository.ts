/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrainingCycle } from '../../types/trainingCycle';

export interface ITrainingCycleRepository {
  getAll(): Promise<TrainingCycle[]>;
  getByStudentId(studentId: string): Promise<TrainingCycle[]>;
  getById(id: string): Promise<TrainingCycle | null>;
  save(cycle: TrainingCycle): Promise<TrainingCycle>;
  delete(id: string): Promise<void>;
}
