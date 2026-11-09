/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhysicalAssessment } from '../../types';

export interface IAssessmentRepository {
  getAll(organizationId?: string): Promise<PhysicalAssessment[]>;
  getByStudentId(studentId: string): Promise<PhysicalAssessment[]>;
  getById(id: string): Promise<PhysicalAssessment | null>;
  create(assessment: PhysicalAssessment): Promise<PhysicalAssessment>;
  update(id: string, patch: Partial<PhysicalAssessment>): Promise<PhysicalAssessment>;
  delete(id: string): Promise<void>;
}
