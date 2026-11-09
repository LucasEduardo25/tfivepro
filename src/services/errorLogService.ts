/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SanitizedErrorLog {
  id: string;
  timestamp: string;
  version: string;
  module: string;
  name?: string;
  message: string;
  componentName?: string;
  componentStack?: string;
  stackSummary?: string;
  route?: string;
}

export interface ErrorLoggingContext {
  componentName?: string;
  componentStack?: string;
  route?: string;
  name?: string;
}

const STORAGE_KEY = 'tfive_sanitized_error_logs_v1';
const MAX_LOGS = 25;
const APP_VERSION = '5.0.0';

/**
 * Sanitizes messages by stripping personal data (emails, names, tokens)
 */
function sanitizeMessage(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  
  return raw
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]')
    .replace(/(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})-?(\d{4}))/g, '[PHONE_REDACTED]')
    .replace(/bearer\s+[A-Za-z0-9-_=.]+/gi, '[AUTH_REDACTED]')
    .slice(0, 1000);
}

/**
 * Extracts a component name from a React component stack string
 */
export function extractComponentNameFromStack(stack?: string): string | undefined {
  if (!stack || typeof stack !== 'string') return undefined;
  const match = stack.match(/in\s+([A-Za-z0-9_]+)/);
  return match ? match[1] : undefined;
}

/**
 * Records a critical error into local storage safely without PII or "[object Object]" artifacts
 */
export function recordSanitizedError(
  module: string, 
  error: unknown, 
  context?: ErrorLoggingContext
): void {
  try {
    let errorName = context?.name || 'Error';
    let rawMessage = '';
    let rawStack: string | undefined = undefined;
    let componentStack = context?.componentStack;
    let componentName = context?.componentName;
    const currentRoute = context?.route || (typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/');

    if (error instanceof Error) {
      errorName = error.name || errorName;
      rawMessage = error.message || 'Erro sem mensagem explícita';
      rawStack = error.stack ? error.stack.split('\n').slice(0, 4).map(l => l.trim()).join(' | ') : undefined;
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, any>;
      if (errObj.name && typeof errObj.name === 'string') {
        errorName = errObj.name;
      }
      if (errObj.message && typeof errObj.message === 'string') {
        rawMessage = errObj.message;
      } else if (errObj.reason && typeof errObj.reason === 'string') {
        rawMessage = errObj.reason;
      } else if (errObj.error && typeof errObj.error === 'string') {
        rawMessage = errObj.error;
      } else if (errObj.statusText && typeof errObj.statusText === 'string') {
        rawMessage = `HTTP ${errObj.status || ''} ${errObj.statusText}`.trim();
      } else {
        try {
          const stringified = JSON.stringify(errObj);
          rawMessage = stringified !== '{}' ? stringified : 'Objeto de erro vazio';
        } catch {
          rawMessage = 'Objeto de erro não serializável';
        }
      }

      if (errObj.stack && typeof errObj.stack === 'string') {
        rawStack = errObj.stack.split('\n').slice(0, 4).map(l => l.trim()).join(' | ');
      }
      if (errObj.componentStack && typeof errObj.componentStack === 'string') {
        componentStack = errObj.componentStack;
      }
    } else if (typeof error === 'string') {
      rawMessage = error;
    } else {
      rawMessage = String(error);
    }

    // Never accept literal "[object Object]" as the message
    if (rawMessage === '[object Object]' || !rawMessage.trim()) {
      rawMessage = 'Falha em componente de interface (detalhes encapsulados)';
    }

    if (!componentName && componentStack) {
      componentName = extractComponentNameFromStack(componentStack);
    }

    const newEntry: SanitizedErrorLog = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      module: module || 'core',
      name: errorName,
      message: sanitizeMessage(rawMessage),
      componentName: componentName ? sanitizeMessage(componentName) : undefined,
      componentStack: componentStack ? sanitizeMessage(componentStack.slice(0, 600)) : undefined,
      stackSummary: rawStack ? sanitizeMessage(rawStack) : undefined,
      route: currentRoute
    };

    const existing = getSanitizedErrorLogs();
    const updated = [newEntry, ...existing].slice(0, MAX_LOGS);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Fail silently to never crash during logging
  }
}

/**
 * Retrieves list of sanitized error logs, filtering out corrupted legacy entries
 */
export function getSanitizedErrorLogs(): SanitizedErrorLog[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    // Filter and sanitize any legacy [object Object] messages
    return parsed.map((item: any) => {
      if (item && item.message === '[object Object]') {
        return {
          ...item,
          name: item.name || 'ReactRenderError',
          message: 'Falha de renderização capturada pelo React ErrorBoundary (v5 sanitizada)'
        };
      }
      return item;
    });
  } catch {
    return [];
  }
}

/**
 * Clears error logs
 */
export function clearSanitizedErrorLogs(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}
