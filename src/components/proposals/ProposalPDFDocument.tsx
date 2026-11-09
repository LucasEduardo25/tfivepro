/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Award, 
  Zap, 
  Star, 
  CreditCard, 
  UserCheck, 
  Phone, 
  Mail, 
  Activity,
  FileCheck,
  Users,
  User
} from 'lucide-react';
import { Proposal, ProposalPlanItem } from '../../types/proposal';
import { 
  formatCurrencyCents, 
  formatBenefitLabel, 
  calculateTotalSavings,
  formatPlanTypeLabel
} from '../../utils/proposalCalculations';

interface ProposalPDFDocumentProps {
  proposal: Proposal;
}

export const ProposalPDFDocument: React.FC<ProposalPDFDocumentProps> = ({ proposal }) => {
  const {
    title,
    studentSnapshot,
    participants = [],
    planType = 'individual',
    service,
    description,
    mode,
    plans,
    conditions,
    validUntil,
    createdAt,
    trainerSnapshot
  } = proposal;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const parts = isoStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      }
    } catch {
      // Fallback
    }
    return isoStr;
  };

  const formattedCreatedDate = formatDate(createdAt);
  const formattedValidUntil = formatDate(validUntil);

  const isMultiParticipant = participants.length > 1 || planType === 'duo' || planType === 'family_group';
  const holderParticipant = participants.find(p => p.role === 'holder') || { 
    id: 'holder_default',
    nameSnapshot: studentSnapshot.name, 
    phoneSnapshot: studentSnapshot.phone,
    role: 'holder' as const 
  };
  const additionalParticipants = participants.filter(p => p.role !== 'holder');

  return (
    <div className="proposal-pdf-root text-zinc-900 bg-white font-sans selection:bg-[#F3F4F6]">
      
      {/* ========================================================
          PAGE 1: CAPA & APRESENTAÇÃO EDITORIAL
      ======================================================== */}
      <div className="a4-page p-8 sm:p-12 flex flex-col justify-between min-h-[1050px] border-b-2 border-zinc-200 print:border-none print-page-break">
        <div>
          {/* Header Brand */}
          <div className="flex items-center justify-between border-b-2 border-[#374151] pb-6 mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-[#374151] text-white px-3 py-1 rounded font-black text-xs tracking-widest uppercase">
                TFIVE PRO
              </div>
              <span className="text-xs font-bold text-zinc-600 tracking-wider uppercase">
                Performance &amp; Longevidade
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                Data de Emissão
              </span>
              <p className="text-xs font-bold text-zinc-800">
                {formattedCreatedDate}
              </p>
            </div>
          </div>

          {/* Main Title Section */}
          <div className="space-y-4 my-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-wider">
              <FileCheck className="w-3.5 h-3.5 text-[#374151]" />
              <span>Proposta Comercial de Treinamento</span>
              <span className="text-zinc-600">·</span>
              <span className="text-[#374151] font-black">{formatPlanTypeLabel(planType)}</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight uppercase leading-tight font-display">
              {title || 'Proposta de Treinamento Personalizado'}
            </h1>
            
            <div className="h-1 w-20 bg-[#374151] rounded-full" />
          </div>

          {/* Recipient & Trainer Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8 bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] block mb-1">
                {isMultiParticipant ? 'Integrantes do Plano' : 'Preparado Exclusivamente Para'}
              </span>
              
              {/* Holder Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                    {holderParticipant.nameSnapshot}
                  </h2>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#374151] text-white">
                    Titular
                  </span>
                </div>

                {studentSnapshot.goal && (
                  <p className="text-xs text-zinc-600 font-medium">
                    <span className="font-bold text-zinc-700">Objetivo:</span> {studentSnapshot.goal}
                  </p>
                )}
                {holderParticipant.phoneSnapshot && (
                  <p className="text-[11px] text-zinc-600">
                    {holderParticipant.phoneSnapshot}
                  </p>
                )}
              </div>

              {/* Additional Participants list if Duo or Family/Group */}
              {additionalParticipants.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">
                    Demais Participantes:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {additionalParticipants.map((part, idx) => (
                      <div 
                        key={part.id || idx}
                        className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-800 flex items-center gap-1.5"
                      >
                        <User className="w-3 h-3 text-[#374151]" />
                        <span>{part.nameSnapshot}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sm:border-l sm:border-zinc-200 sm:pl-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-1">
                Profissional Responsável
              </span>
              <h3 className="text-base font-bold text-zinc-900">
                {trainerSnapshot?.name || 'Personal Trainer'}
              </h3>
              <p className="text-xs text-zinc-600 font-medium">
                {trainerSnapshot?.cref ? `CREF: ${trainerSnapshot.cref}` : 'Treinador de Alto Rendimento'}
              </p>
              {trainerSnapshot?.phone && (
                <p className="text-[11px] text-zinc-600 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-zinc-600" />
                  <span>{trainerSnapshot.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* Presentation Statement */}
          <div className="space-y-4 my-8">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#374151]" />
              <span>Metodologia &amp; Compromisso Profissional</span>
            </h4>
            <p className="text-sm text-zinc-700 leading-relaxed">
              {description || 
                'Esta proposta tem por objetivo apresentar o planejamento estratégico de treinamento físico individualizado, focado no alcance sustentável e seguro dos seus objetivos, com acompanhamento sistemático de sobrecarga progressiva, evolução biomecânica e longevidade funcional.'}
            </p>
          </div>

          {/* Key Pillars */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="border border-zinc-200 rounded-xl p-4 bg-white">
              <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#374151] flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-zinc-900">Segurança &amp; Técnica</h5>
              <p className="text-[10px] text-zinc-600 mt-1 leading-snug">Prescrição baseada em biomecânica e controle de sobrecarga.</p>
            </div>
            <div className="border border-zinc-200 rounded-xl p-4 bg-white">
              <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#374151] flex items-center justify-center mb-2">
                <Zap className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-zinc-900">Progressão Real</h5>
              <p className="text-[10px] text-zinc-600 mt-1 leading-snug">Métricas precisas de evolução e testes periódicos.</p>
            </div>
            <div className="border border-zinc-200 rounded-xl p-4 bg-white">
              <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#374151] flex items-center justify-center mb-2">
                <Award className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-zinc-900">Resultados Focados</h5>
              <p className="text-[10px] text-zinc-600 mt-1 leading-snug">Acompanhamento próximo com suporte e motivação contínua.</p>
            </div>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="pt-6 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-600">
          <span>TFIVE PRO — Sistema Profissional de Treinamento</span>
          <span>Página 1 de {mode === 'compare_plans' ? '3' : '2'}</span>
        </div>
      </div>

      {/* ========================================================
          PAGE 2: DETALHES DOS PLANOS & ITENS INCLUSOS
      ======================================================== */}
      <div className="a4-page p-8 sm:p-12 flex flex-col justify-between min-h-[1050px] border-b-2 border-zinc-200 print:border-none print-page-break">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#374151] pb-4 mb-8">
            <div className="flex items-center gap-2">
              <span className="bg-[#374151] text-white px-2.5 py-0.5 rounded font-black text-[10px] tracking-widest uppercase">
                TFIVE PRO
              </span>
              <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                Estrutura do Acompanhamento &amp; Investimento
              </h3>
            </div>
            <span className="text-[11px] text-zinc-600 font-bold uppercase">
              {holderParticipant.nameSnapshot} {participants.length > 1 ? `(+${participants.length - 1})` : ''}
            </span>
          </div>

          {/* Section: Plans Details */}
          <div className="space-y-6">
            {plans.map((plan: ProposalPlanItem, idx: number) => {
              const { pricing } = plan;
              const { planSavingsCents, totalCashSavingsCents } = calculateTotalSavings(
                pricing.originalAmountCents,
                pricing.finalAmountCents,
                pricing.cashFinalAmountCents
              );

              return (
                <div 
                  key={plan.id || idx}
                  className={`border rounded-2xl p-6 transition-all ${
                    plan.isRecommended 
                      ? 'border-[#374151] bg-zinc-50/50 shadow-sm relative' 
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  {plan.isRecommended && (
                    <div className="absolute -top-3 right-6 bg-[#374151] text-white text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" />
                      <span>Recomendado para seus objetivos</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-200 pb-5 mb-5">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-black text-zinc-950 uppercase tracking-tight font-display">
                          {plan.name}
                        </h4>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-zinc-200 text-zinc-800">
                          {plan.durationMonths} {plan.durationMonths === 1 ? 'Mês' : 'Meses'}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#374151] border border-[#374151]/20">
                          {participants.length} {participants.length === 1 ? 'Pessoa' : 'Pessoas'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 font-medium mt-1">
                        <span className="font-bold text-zinc-800">Serviço:</span> {plan.service || service} · <span className="font-bold text-zinc-800">Frequência:</span> {plan.frequency}
                      </p>
                      {plan.description && (
                        <p className="text-xs text-zinc-600 mt-2 leading-relaxed max-w-2xl">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Price highlight */}
                    <div className="sm:text-right bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-none border-zinc-200">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block">
                        {participants.length > 1 ? 'Investimento Mensal do Grupo' : 'Investimento Mensal Equivalente'}
                      </span>
                      <div className="text-2xl font-black text-[#374151] font-mono-nums">
                        {formatCurrencyCents(pricing.equivalentMonthlyAmountCents)}
                        <span className="text-xs font-bold text-zinc-600"> /mês</span>
                      </div>

                      {participants.length > 1 && (
                        <span className="block text-xs font-bold text-zinc-700 mt-0.5 font-mono-nums">
                          {formatCurrencyCents(pricing.perPersonEquivalentMonthlyAmountCents || Math.round(pricing.equivalentMonthlyAmountCents / participants.length))} / pessoa / mês
                        </span>
                      )}

                      {pricing.discountAmountCents > 0 && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {formatBenefitLabel(pricing)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Included Items / Benefits */}
                  {plan.benefits && plan.benefits.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block">
                        O Que Está Incluso no Acompanhamento
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {plan.benefits.map((benefit, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-2 text-xs text-zinc-800">
                            <CheckCircle2 className="w-4 h-4 text-[#374151] shrink-0 mt-0.5" />
                            <span className="font-medium leading-snug">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Financial Breakdown Card (Executive View) */}
          <div className="my-8 bg-zinc-950 text-white rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] block mb-0.5">
                  Condições Comerciais Estruturadas
                </span>
                <h4 className="text-lg font-black tracking-tight text-white uppercase font-display">
                  Resumo Financeiro do Investimento
                </h4>
              </div>
              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#374151]">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            {plans.map((plan: ProposalPlanItem, idx: number) => {
              const { pricing } = plan;
              const { planSavingsCents, totalCashSavingsCents } = calculateTotalSavings(
                pricing.originalAmountCents,
                pricing.finalAmountCents,
                pricing.cashFinalAmountCents
              );

              return (
                <div key={plan.id || idx} className="space-y-4">
                  {plans.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                        {plan.name} ({plan.durationMonths} meses · {participants.length} {participants.length === 1 ? 'pessoa' : 'pessoas'})
                      </span>
                      {plan.isRecommended && (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-[#374151] text-white rounded">
                          Recomendado
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                        Valor Regular Total
                      </span>
                      <p className="text-sm font-bold text-zinc-600 line-through font-mono-nums">
                        {formatCurrencyCents(pricing.originalAmountCents)}
                      </p>
                    </div>

                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                        {formatBenefitLabel(pricing)}
                      </span>
                      <p className="text-sm font-bold text-emerald-400 font-mono-nums">
                        {pricing.discountAmountCents > 0 
                          ? `- ${formatCurrencyCents(pricing.discountAmountCents)}` 
                          : 'Sem Desconto'}
                      </p>
                    </div>

                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                        Parcelamento
                      </span>
                      <p className="text-sm font-black text-white font-mono-nums">
                        {pricing.installments}× {formatCurrencyCents(pricing.installmentAmountCents)}
                      </p>
                    </div>

                    <div className="bg-[#F3F4F6] border border-[#D1D5DB] rounded-xl p-3.5">
                      <span className="text-[10px] font-black text-[#374151] uppercase tracking-wider block mb-1">
                        Valor Final do Contrato
                      </span>
                      <p className="text-base font-black text-white font-mono-nums">
                        {formatCurrencyCents(pricing.finalAmountCents)}
                      </p>
                    </div>
                  </div>

                  {/* Cash Condition */}
                  {pricing.cashOptionEnabled && (
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            Opção de Pagamento à Vista (PIX / Transferência)
                          </span>
                          {pricing.cashDiscountAmountCents > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                              Economia Adicional: {formatCurrencyCents(pricing.cashDiscountAmountCents)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Economia total acumulada de {formatCurrencyCents(totalCashSavingsCents)} em relação ao valor regular.
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-400 font-mono-nums">
                          {formatCurrencyCents(pricing.cashFinalAmountCents)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="pt-6 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-600">
          <span>TFIVE PRO — Sistema Profissional de Treinamento</span>
          <span>Página 2 de {mode === 'compare_plans' ? '3' : '2'}</span>
        </div>
      </div>

      {/* ========================================================
          PAGE 3: CONDIÇÕES GERAIS, VALIDADE & ASSINATURAS
      ======================================================== */}
      <div className="a4-page p-8 sm:p-12 flex flex-col justify-between min-h-[1050px] print:border-none">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#374151] pb-4 mb-8">
            <div className="flex items-center gap-2">
              <span className="bg-[#374151] text-white px-2.5 py-0.5 rounded font-black text-[10px] tracking-widest uppercase">
                TFIVE PRO
              </span>
              <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                Termos &amp; Formalização
              </h3>
            </div>
            <span className="text-[11px] text-zinc-600 font-bold uppercase">
              {holderParticipant.nameSnapshot}
            </span>
          </div>

          {/* Conditions & Terms */}
          <div className="space-y-6 my-6">
            <div className="border border-zinc-200 rounded-2xl p-6 bg-zinc-50 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#374151]" />
                <span>Condições Gerais do Acompanhamento</span>
              </h4>
              
              <div className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line space-y-2">
                {conditions || (
                  `1. Duração e Agendamento: As sessões serão agendadas com antecedência mínima e respeitarão a grade combinada entre aluno e treinador.
2. Reposições: Cancelamentos com aviso prévio mínimo de 12 horas poderão ser remarcados mediante disponibilidade de horário no mesmo mês vigente.
3. Avaliações Periódicas: Estão inclusos retestes periódicos de evolução de força, composição corporal e testes funcionais TFIVE PRO.
4. Forma de Pagamento: Os pagamentos das parcelas ou à vista devem ser liquidados conforme as datas estipuladas no fechamento do contrato.`
                )}
              </div>
            </div>

            {/* Validity Notice */}
            <div className="border-2 border-dashed border-[#D1D5DB] bg-[#374151]/5 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] block">
                  Validade da Proposta Comercial
                </span>
                <p className="text-xs text-zinc-800 font-bold mt-0.5">
                  Esta proposta e suas condições comerciais especiais são válidas até{' '}
                  <span className="text-[#374151] font-black underline">{formattedValidUntil}</span>.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#374151] shrink-0">
                <Calendar className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="my-14 space-y-12">
            <div className="grid grid-cols-2 gap-12 pt-8">
              <div className="text-center space-y-2">
                <div className="border-b border-zinc-400 w-full h-8" />
                <p className="text-xs font-bold text-zinc-900 uppercase">
                  {holderParticipant.nameSnapshot}
                </p>
                <span className="text-[10px] text-zinc-600 block">
                  {isMultiParticipant ? 'Titular / Contratante Principal' : 'Aluno(a) / Contratante'}
                </span>
              </div>

              <div className="text-center space-y-2">
                <div className="border-b border-zinc-400 w-full h-8" />
                <p className="text-xs font-bold text-zinc-900 uppercase">
                  {trainerSnapshot?.name || 'Personal Trainer'}
                </p>
                <span className="text-[10px] text-zinc-600 block">
                  {trainerSnapshot?.cref ? `CREF: ${trainerSnapshot.cref}` : 'Personal Trainer Responsável'}
                </span>
              </div>
            </div>
          </div>

          {/* Brand Manifesto Quote */}
          <div className="text-center py-6 border-t border-zinc-200">
            <p className="text-xs font-black text-zinc-900 uppercase tracking-wider font-display">
              {trainerSnapshot?.slogan || 'PERFORMANCE SEM DESCULPAS. RESULTADOS SEM LIMITES.'}
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">
              TFIVE PRO — Gestão de Alto Nível para Personal Trainers
            </p>
          </div>
        </div>

        {/* Page 3 Footer */}
        <div className="pt-6 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-600">
          <span>Documento Comercial Confidencial</span>
          <span>Página {mode === 'compare_plans' ? '3 de 3' : '2 de 2'}</span>
        </div>
      </div>

    </div>
  );
};
