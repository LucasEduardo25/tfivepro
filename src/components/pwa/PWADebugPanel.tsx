import React, { useEffect, useState } from 'react';

export const PWADebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);
    
    addLog(`UserAgent: ${navigator.userAgent}`);
    addLog(`Standalone mode: ${window.matchMedia('(display-mode: standalone)').matches}`);
    
    if ('serviceWorker' in navigator) {
      addLog('SERVICE_WORKER_SUPPORTED: true');
      navigator.serviceWorker.getRegistration().then((reg) => {
        addLog(`SERVICE_WORKER_REGISTERED: ${!!reg}`);
        if (reg) {
          addLog(`SW_SCOPE: ${reg.scope}`);
          addLog(`SW_ACTIVE: ${!!reg.active}`);
        }
      }).catch(err => addLog(`SW_REG_ERROR: ${err.message}`));
      
      addLog(`SW_CONTROLS_PAGE: ${!!navigator.serviceWorker.controller}`);
    } else {
      addLog('SERVICE_WORKER_SUPPORTED: false');
    }

    const handleBIP = (e: any) => {
      e.preventDefault();
      addLog('BEFOREINSTALLPROMPT_RECEIVED: true');
    };
    window.addEventListener('beforeinstallprompt', handleBIP);

    // Also try fetching the manifest
    fetch('/manifest.webmanifest')
      .then(r => {
        addLog(`MANIFEST_FETCH_OK: ${r.ok}`);
        addLog(`MANIFEST_CONTENT_TYPE: ${r.headers.get('content-type')}`);
      })
      .catch(e => addLog(`MANIFEST_FETCH_ERROR: ${e.message}`));

    return () => window.removeEventListener('beforeinstallprompt', handleBIP);
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', color: 'lime', fontSize: '10px', zIndex: 9999, padding: '10px', maxHeight: '200px', overflowY: 'auto', pointerEvents: 'none' }}>
      <strong>PWA DIAGNOSTICS:</strong>
      {logs.map((log, i) => <div key={i}>{log}</div>)}
    </div>
  );
};
