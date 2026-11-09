/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — TELA DE LOGIN & AUTENTICAÇÃO REAL (SUPABASE AUTH)
 * Substitui o login simulado local por autenticação oficial do Supabase Auth.
 */

import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { Lock, Mail, User, Building2, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { TFiveLogo } from '../common/TFiveLogo';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<'TRAINER' | 'STUDENT'>('TRAINER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    if (mode === 'signup' && !organizationName.trim()) {
      setErrorMessage('Informe o nome do seu espaço de trabalho.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await authService.loginWithSupabase(email, password);
        
        if (selectedRole === 'TRAINER' && user.role === 'STUDENT') {
          await authService.logout();
          setErrorMessage('Sua conta não possui permissão de Treinador. Selecione "SOU ALUNO" para entrar.');
          setLoading(false);
          return;
        }
        
        if (selectedRole === 'STUDENT' && user.role !== 'STUDENT') {
          // If a trainer tries to login as student via this screen directly, we could handle it, 
          // but authService will load them as TRAINER and route them to trainer dashboard.
          // To strictly enforce the student experience, they should use "Acessar como Aluno" from dashboard.
          // We will just let the normal flow happen, or throw.
          // For simplicity, let's allow it but they go to trainer dashboard anyway, OR we can throw.
          // Let's just enforce selectedRole === 'STUDENT' requires user.role === 'STUDENT' for clarity.
          // Actually, let's not block trainers from logging in just because they misclicked, 
          // but we will enforce the trainer restriction as requested.
        }

        setSuccessMessage('Autenticado com sucesso! Carregando workspace...');
        if (onLoginSuccess) {
          setTimeout(onLoginSuccess, 400);
        }
      } else {
        await authService.signUpWithSupabase(email, password, fullName, organizationName);
        setSuccessMessage('Cadastro recebido. Seu espaço de trabalho será criado automaticamente. Se a confirmação de e-mail estiver ativa, confirme seu endereço antes de entrar.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha na autenticação. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">
        {/* Header com identidade TFIVE PRO */}
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center">
            <TFiveLogo size="lg" theme="light" />
          </div>
          <p className="text-xs text-[#4B5563]">Gestão e Performance para Treinadores</p>
        </div>

        {/* Alternador de Modo: Login / Cadastro */}
        <div className="flex border-b border-[#ECEEF1] mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              mode === 'login'
                ? 'border-[#374151] text-[#1F2937]'
                : 'border-transparent text-[#4B5563] hover:text-[#1F2937]'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'border-[#374151] text-[#1F2937]'
                : 'border-transparent text-[#4B5563] hover:text-[#1F2937]'
            }`}
          >
            Cadastrar Treinador
          </button>
        </div>

        {/* Alerta de Erro */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Falha na operação</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Alerta de Sucesso */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Sucesso</p>
              <p className="mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        
        {/* Toggle Treinador / Aluno */}
        <div className="flex bg-[#F3F4F6] p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setSelectedRole('TRAINER')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              selectedRole === 'TRAINER' 
                ? 'bg-white text-[#111827] shadow-sm' 
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            SOU TREINADOR
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('STUDENT')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              selectedRole === 'STUDENT' 
                ? 'bg-white text-[#111827] shadow-sm' 
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            SOU ALUNO
          </button>
        </div>
        
        {/* Formulário de Login / Cadastro */}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Carlos Personal"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[#1F2937] text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#374151] transition-colors"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Nome do espaço de trabalho
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" />
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Ex: Studio Lucas Treinamento"
                  required
                  maxLength={80}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[#1F2937] text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#374151] transition-colors"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#6B7280]">
                Esse será o seu ambiente exclusivo dentro do TFIVE PRO.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[#1F2937] text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#374151] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D1D5DB] rounded-xl text-[#1F2937] text-xs placeholder-[#6B7280] focus:outline-none focus:border-[#374151] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 px-4 bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : mode === 'login' ? (
              <>
                <span>Acessar Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Criar Conta no Supabase</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#ECEEF1] text-center">
          <p className="text-[11px] text-[#4B5563]">
            Autenticação segura via Supabase Auth &bull; RLS multi-tenant ativo
          </p>
        </div>
      </div>
    </div>
  );
};
