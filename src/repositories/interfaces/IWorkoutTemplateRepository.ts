import { WorkoutTemplate } from '../../types';

export interface IWorkoutTemplateRepository {
  getAll(organizationId?: string): Promise<WorkoutTemplate[]>;
  getById(id: string): Promise<WorkoutTemplate | null>;
  create(template: WorkoutTemplate): Promise<WorkoutTemplate>;
  update(id: string, patch: Partial<WorkoutTemplate>): Promise<WorkoutTemplate>;
  delete(id: string): Promise<void>;
}
