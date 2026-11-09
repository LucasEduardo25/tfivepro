/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../../types';

export interface IStudentRepository {
  getAll(organizationId?: string): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
  create(student: Student): Promise<Student>;
  update(id: string, patch: Partial<Student>): Promise<Student>;
  delete(id: string): Promise<void>;
}
