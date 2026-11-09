/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { recordSanitizedError } from './errorLogService';
import { DB_NAME, DB_VERSION } from '../db/indexedDB';

/**
 * Downloads a Blob directly to the client's device without UI dependencies
 */
export function triggerDirectDownload(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    recordSanitizedError('emergency_download', err);
    throw err;
  }
}

/**
 * Directly dumps all IndexedDB stores to a valid JSON backup,
 * completely decoupled from React context or higher-level business components.
 */
export async function exportEmergencyBackup(): Promise<{
  success: boolean;
  filename: string;
  blob?: Blob;
  sizeFormatted?: string;
  error?: string;
}> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      const timer = setTimeout(() => reject(new Error('Timeout de conexão com o banco')), 6000);
      req.onsuccess = () => {
        clearTimeout(timer);
        resolve(req.result);
      };
      req.onerror = () => {
        clearTimeout(timer);
        reject(req.error || new Error('Falha ao abrir banco IndexedDB'));
      };
      req.onblocked = () => {
        clearTimeout(timer);
        reject(new Error('Banco bloqueado por outra aba aberta'));
      };
    });

    const storesToDump = Array.from(db.objectStoreNames);
    const dumpData: Record<string, any[]> = {};

    for (const storeName of storesToDump) {
      try {
        const records = await new Promise<any[]>((res) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => res([]);
        });
        dumpData[storeName] = records;
      } catch {
        dumpData[storeName] = [];
      }
    }

    db.close();

    const emergencyPayload = {
      appName: 'TFIVE PRO',
      format: 'TFIVE_EMERGENCY_BACKUP',
      backupVersion: 5,
      createdAt: new Date().toISOString(),
      metadata: {
        isEmergency: true,
        extractedStores: storesToDump,
        totalStores: storesToDump.length
      },
      data: dumpData
    };

    const jsonString = JSON.stringify(emergencyPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `TFIVE_PRO_BACKUP_EMERGENCIA_${dateStr}.tfivebackup`;

    triggerDirectDownload(blob, filename);

    const sizeFormatted = `${(blob.size / 1024).toFixed(1)} KB`;

    return {
      success: true,
      filename,
      blob,
      sizeFormatted
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    recordSanitizedError('emergency_backup_export', err);
    return {
      success: false,
      filename: '',
      error: msg
    };
  }
}
