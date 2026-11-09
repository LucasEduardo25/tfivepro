/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  FileText, 
  Check, 
  Copy, 
  MessageSquare,
  ZoomIn,
  ZoomOut,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import { Proposal } from '../../types/proposal';
import { ProposalPDFDocument } from './ProposalPDFDocument';
import { formatCurrencyCents } from '../../utils/proposalCalculations';
import { buildTFIVEFilename } from '../../utils/fileDownloadService';
import { exportElementToPDF } from '../../services/pdfExportService';

interface ProposalPDFModalProps {
  proposal: Proposal;
  onClose: () => void;
  onStatusChange?: (newStatus: Proposal['status']) => void;
}

export const ProposalPDFModal: React.FC<ProposalPDFModalProps> = ({
  proposal,
  onClose,
  onStatusChange
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async (action: 'download' | 'share') => {
    if (!documentRef.current || isExportingPDF) return;

    try {
      setIsExportingPDF(true);
      
      const filename = buildTFIVEFilename(
        'Proposta',
        proposal.studentSnapshot.name,
        proposal.createdAt,
        'pdf'
      );

      const pdfBlob = await exportElementToPDF({
        element: documentRef.current,
        filename
      });

      if (action === 'share') {
        const { shareOrDownloadFile } = await import('../../utils/fileDownloadService');
        await shareOrDownloadFile({
          blob: pdfBlob,
          filename,
          title: `Proposta TFIVE - ${proposal.studentSnapshot.name}`,
          text: 'Segue a proposta de treinamento TFIVE PRO.'
        });
      } else {
        const { downloadBlob } = await import('../../utils/fileDownloadService');
        downloadBlob(pdfBlob, filename);
      }

      if (onStatusChange && proposal.status === 'draft') {
        onStatusChange('sent');
      }
    } catch (err) {
      console.error('Falha ao exportar PDF da proposta:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const generateWhatsAppMessage = (): string => {
    const recommendedPlan = proposal.plans.find(p => p.isRecommended) || proposal.plans[0];
    const studentFirstName = proposal.studentSnapshot.name.split(' ')[0];
    const participants = proposal.participants || [];
    const isMulti = participants.length > 1 || proposal.planType === 'duo' || proposal.planType === 'family_group';
    
    let msg = `Olá, *${studentFirstName}*! Tudo bem?\n\n`;
    if (isMulti) {
      const typeLabel = proposal.planType === 'duo' ? 'Plano em Dupla/Casal' : 'Plano Familiar/Grupo';
      msg += `Preparei nossa *Proposta Comercial de Treinamento (${typeLabel} — ${participants.length} participantes)* com todo o planejamento estruturado para os objetivos de vocês:\n\n`;
    } else {
      msg += `Preparei sua *Proposta Comercial de Treinamento Personalizado (TFIVE PRO)* com todo o planejamento individualizado para alcançarmos seus objetivos:\n\n`;
    }
    
    if (recommendedPlan) {
      msg += `📌 *Plano Recomendado:* ${recommendedPlan.name}\n`;
      msg += `⏱️ *Duração:* ${recommendedPlan.durationMonths} ${recommendedPlan.durationMonths === 1 ? 'mês' : 'meses'}\n`;
      if (isMulti) {
        msg += `👥 *Participantes:* ${participants.length} pessoas\n`;
        msg += `💳 *Investimento do Grupo:* ${recommendedPlan.pricing.installments}× de ${formatCurrencyCents(recommendedPlan.pricing.installmentAmountCents)}`;
        const perPersonMonthly = recommendedPlan.pricing.perPersonEquivalentMonthlyAmountCents || Math.round(recommendedPlan.pricing.equivalentMonthlyAmountCents / participants.length);
        msg += ` _(equivale a ${formatCurrencyCents(perPersonMonthly)} / pessoa / mês)_\n`;
      } else {
        msg += `💳 *Investimento:* ${recommendedPlan.pricing.installments}× de ${formatCurrencyCents(recommendedPlan.pricing.installmentAmountCents)}\n`;
      }
      if (recommendedPlan.pricing.discountAmountCents > 0) {
        msg += `✨ *Condição Comercial Especial inclusa!*\n`;
      }
      if (recommendedPlan.pricing.cashOptionEnabled) {
        msg += `💰 *À Vista (PIX):* ${formatCurrencyCents(recommendedPlan.pricing.cashFinalAmountCents)}\n`;
      }
    }

    if (proposal.validUntil) {
      const parts = proposal.validUntil.split('T')[0].split('-');
      if (parts.length === 3) {
        msg += `\n⏳ *Condições válidas até:* ${parts[2]}/${parts[1]}/${parts[0]}\n`;
      }
    }

    msg += `\nEstou enviando o documento oficial em anexo em PDF. Vamos começar? 💪🔥`;
    return msg;
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const phone = proposal.studentSnapshot.phone?.replace(/\D/g, '') || '';
    const url = phone.length >= 10 
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    if (onStatusChange && proposal.status === 'draft') {
      onStatusChange('sent');
    }
  };

  const handleCopyMessage = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Modal Card */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print p-4 bg-[#18181B] border-b border-[#27272A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Proposta Comercial — Visualização &amp; PDF
              </h2>
              <p className="text-[11px] text-[#4B5563]">
                {proposal.title} · <span className="text-white font-medium">{proposal.studentSnapshot.name}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* Zoom Controls (Desktop) */}
            <div className="hidden sm:flex items-center bg-[#27272A]/70 rounded-xl p-1 border border-[#3F3F46]">
              <button
                onClick={() => setZoomScale(s => Math.max(0.7, s - 0.1))}
                className="p-1.5 text-[#4B5563] hover:text-white transition-colors"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono font-bold text-zinc-300 px-1.5">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale(s => Math.min(1.3, s + 0.1))}
                className="p-1.5 text-[#4B5563] hover:text-white transition-colors"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Copy WhatsApp text */}
            <button
              onClick={handleCopyMessage}
              className="px-3 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold transition-all flex items-center gap-1.5"
              title="Copiar texto formatado para WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            {/* Direct WhatsApp Share */}
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#25D366]/20"
              title="Abrir no WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Direct Export to PDF */}
            <button
              onClick={() => handleExportPDF('download')}
              disabled={isExportingPDF}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700 flex items-center gap-1.5 disabled:opacity-80"
              title="Baixar arquivo PDF direto"
            >
              <Download className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden sm:inline">{isExportingPDF ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>

            {/* Share PDF */}
            <button
              onClick={() => handleExportPDF('share')}
              disabled={isExportingPDF}
              className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] hover:text-white text-[#1F2937] text-xs font-bold transition-all border border-[#E5E7EB] flex items-center gap-1.5 disabled:opacity-80"
              title="Compartilhar PDF"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compartilhar PDF</span>
            </button>

            {/* Print / Save PDF via Browser */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#27272A] transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Scroll Viewport */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-[#0A0A0A] flex justify-center">
          <div 
            style={{ 
              transform: `scale(${zoomScale})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease'
            }}
            className="w-full max-w-4xl"
          >
            <div 
              ref={documentRef}
              className="print-container bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden font-sans border border-zinc-200"
            >
              <ProposalPDFDocument proposal={proposal} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
