/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Proposal } from '../../types/proposal';

export interface IProposalRepository {
  getAll(organizationId?: string): Promise<Proposal[]>;
  getById(id: string): Promise<Proposal | null>;
  save(proposal: Proposal): Promise<Proposal>;
  delete(id: string): Promise<void>;
}
