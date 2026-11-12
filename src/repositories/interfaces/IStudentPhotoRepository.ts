import { StudentPhoto } from '../../types';

export interface IStudentPhotoRepository {
  getAll(organizationId?: string): Promise<StudentPhoto[]>;
  save(photo: StudentPhoto): Promise<StudentPhoto>;
  delete(id: string): Promise<void>;
}
