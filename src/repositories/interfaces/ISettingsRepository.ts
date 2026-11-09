/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ISettingsRepository {
  get<T>(key: string, defaultValue?: T): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}
