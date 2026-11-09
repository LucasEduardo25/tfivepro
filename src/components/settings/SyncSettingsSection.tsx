/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — PAINEL DE CONEXÃO COM O SERVIDOR (V5.0)
 * Supabase PostgreSQL é a única fonte oficial dos dados de negócio.
 */

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { authService } from '../../services/authService';
import { useApp } from '../../context/AppContext';

export type ServerConnectionStatus = 'conectado' | 'verificando' | 'indisponivel';

export const SyncSettingsSection: React.FC = () => {
  const { refreshData } = useApp();
  const [status, setStatus] = useState<ServerConnectionStatus>('verificando');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authState = authService.getAuthState();

  const checkConnection = async () => {
    setStatus('verificando');
    setErrorMessage(null);
    const start = performance.now();

    try {
      if (!isSupabaseConfigured()) {
        setStatus('indisponivel');
        setErrorMessage('Credenciais do Supabase não configuradas no ambiente.');
        setLastChecked(new Date().toLocaleTimeString('pt-BR'));
        return;
      }

      if (!navigator.onLine) {
        setStatus('indisponivel');
        setErrorMessage('Dispositivo sem conexão com a internet.');
        setLastChecked(new Date().toLocaleTimeString('pt-BR'));
        return;
      }

      // Consulta de verificação de pulso junto ao Supabase
      const { error } = await supabase.from('organizations').select('id').limit(1);

      const duration = Math.round(performance.now() - start);
      setLatencyMs(duration);
      setLastChecked(new Date().toLocaleTimeString('pt-BR'));

      if (error) {
        // Se a sessão expirou ou deu erro de banco
        console.warn('Erro ao testar pulso do servidor Supabase:', error);
        setStatus('indisponivel');
        setErrorMessage(error.message || 'Falha na resposta do servidor.');
      } else {
        setStatus('conectado');
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setLatencyMs(duration);
      setLastChecked(new Date().toLocaleTimeString('pt-BR'));
      setStatus('indisponivel');
      setErrorMessage(err?.message || 'Falha ao conectar com o servidor Supabase.');
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleRefreshServerData = async () => {
    await checkConnection();
    try {
      await refreshData();
    } catch (err) {
      console.error('Erro ao atualizar dados do servidor:', err);
    }
  };

  const getStatusBadge = () => {
    if (status === 'verificando') {
      return (
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Verificando...</span>
        </span>
      );
    }
    if (status === 'conectado') {
      return (
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Conectado</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Indisponível</span>
      </span>
    );
  };

  return (
    <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <span>Conexão com o servidor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-normal">
                Supabase PostgreSQL
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Supabase é a única fonte oficial de verdade para todos os dados operacionais do TFIVE PRO.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Grid de Informações de Conexão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Status da Conectividade */}
        <div className="bg-[#18181B] p-4 rounded-xl border border-[#27272A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Estado do Servidor</span>
            {status === 'conectado' ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          <div className="text-sm font-bold text-white capitalize">
            {status}
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
            <span>Latência de pulso:</span>
            <span className="font-mono text-zinc-300">
              {latencyMs !== null ? `${latencyMs} ms` : '—'}
            </span>
          </div>
        </div>

        {/* Organização Ativa */}
        <div className="bg-[#18181B] p-4 rounded-xl border border-[#27272A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Organização Autorizada</span>
            <Building2 className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-sm font-bold text-white truncate">
            {authState.organizationId ? (
              <span className="font-mono text-xs text-emerald-400">{authState.organizationId}</span>
            ) : (
              <span className="text-zinc-500">Não identificada</span>
            )}
          </div>
          <div className="text-[11px] text-zinc-400 pt-1">
            Isolamento de dados multi-tenant por RLS
          </div>
        </div>

        {/* Usuário Autenticado */}
        <div className="bg-[#18181B] p-4 rounded-xl border border-[#27272A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sessão Ativa</span>
            <UserCheck className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-sm font-bold text-white truncate">
            {authState.user?.email || 'Usuário Autenticado'}
          </div>
          <div className="text-[11px] text-zinc-400 pt-1">
            Perfil: <strong className="text-zinc-300">{authState.role || 'TRAINER'}</strong>
          </div>
        </div>

      </div>

      {/* Mensagem de Erro (se houver) */}
      {errorMessage && (
        <div className="p-3.5 bg-red-950/30 border border-red-800/40 rounded-xl flex items-start gap-3 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-red-200">Atenção na Conexão:</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Ações e Rodapé */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {lastChecked 
              ? `Última verificação às ${lastChecked}` 
              : 'Verificação em andamento...'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefreshServerData}
          disabled={status === 'verificando'}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === 'verificando' ? 'animate-spin' : ''}`} />
          <span>Verificar Conexão com Servidor</span>
        </button>
      </div>

    </div>
  );
};
