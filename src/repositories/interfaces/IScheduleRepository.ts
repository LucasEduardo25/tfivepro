/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduleAppointment, ScheduleRecurrence } from '../../types';

export interface IScheduleRepository {
  getAppointments(organizationId?: string): Promise<ScheduleAppointment[]>;
  getRecurrences(organizationId?: string): Promise<ScheduleRecurrence[]>;
  saveAppointment(appointment: ScheduleAppointment): Promise<ScheduleAppointment>;
  deleteAppointment(id: string): Promise<void>;
  saveRecurrence(recurrence: ScheduleRecurrence): Promise<ScheduleRecurrence>;
  deleteRecurrence(id: string): Promise<void>;
}
