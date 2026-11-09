/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — HOOK DE CONECTIVIDADE EM TEMPO REAL
 * Monitora status de rede online/offline e fornece diagnóstico ativo.
 */

import { useEffect, useState, useCallback } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);

  // Verificação ativa via ping rápido
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }

    try {
      // Ping em recurso estático local ou cabeçalho leve com cache-busting
      const response = await fetch(`/favicon.svg?t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store'
      });
      const online = response.ok;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setJustReconnected(true);
        const timer = setTimeout(() => {
          setJustReconnected(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return {
    isOnline,
    wasOffline,
    justReconnected,
    checkConnectivity
  };
}
