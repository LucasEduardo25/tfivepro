/**
 * TFIVE PRO - PDF Export Service
 * Generates genuine A4 PDF documents from printable DOM elements and triggers
 * reliable file downloads across Android Tablet, Mobile, Desktop, and PWA.
 */

import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import { downloadBlob, sanitizeFilename } from '../utils/fileDownloadService';

export interface PDFExportOptions {
  /** The root container element representing the printable document */
  element: HTMLElement;
  /** Desired filename (e.g. TFIVE_Avaliacao_NomeAluno_2026-09-13.pdf) */
  filename: string;
  /** Optional callback to report progress status */
  onProgress?: (status: string) => void;
  /** Scale factor for html2canvas (default: 2 for sharp 300dpi printing) */
  scale?: number;
}

export async function exportElementToPDF({
  element,
  filename,
  onProgress,
  scale = 2
}: PDFExportOptions): Promise<Blob> {
  try {
    console.log('[PDF] geração iniciada', { filename, scale });
    onProgress?.('Preparando documento...');

    // Ensure elements are fully visible and images are loaded
    await document.fonts?.ready;

    onProgress?.('Renderizando alta resolução...');

    // Configure for crisp multi-page document capture
    const canvas = await toCanvas(element, {
      pixelRatio: scale,
      backgroundColor: '#ffffff',
      width: element.scrollWidth || 1024,
      height: element.scrollHeight || 1448,
      cacheBust: true,
      imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Transparent 1x1 pixel
      skipAutoScale: true,
      style: {
        maxHeight: 'none',
        overflow: 'visible',
        height: 'auto',
        width: '210mm',
        maxWidth: '210mm',
        margin: '0',
        backgroundColor: '#ffffff'
      },
      filter: (node: HTMLElement) => {
        // Exclude hidden print elements
        if (node.classList?.contains('no-print') || node.classList?.contains('print:hidden')) {
          return false;
        }
        return true;
      }
    });

    console.log('[PDF] renderização concluída', { canvasWidth: canvas.width, canvasHeight: canvas.height });
    onProgress?.('Formatando páginas A4...');

    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const a4Ratio = pdfHeight / pdfWidth; // 1.4142857

    const canvasWidth = canvas.width;
    const totalCanvasHeight = canvas.height;
    const pageCanvasHeight = Math.floor(canvasWidth * a4Ratio);

    let currentY = 0;
    let pageIndex = 0;

    while (currentY < totalCanvasHeight) {
      if (pageIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const remainingHeight = totalCanvasHeight - currentY;
      const sliceHeight = Math.min(pageCanvasHeight, remainingHeight);

      // Create a temporary canvas for this specific A4 page slice
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvasWidth;
      sliceCanvas.height = sliceHeight;

      const sliceCtx = sliceCanvas.getContext('2d');
      if (sliceCtx) {
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, canvasWidth, sliceHeight);
        sliceCtx.drawImage(
          canvas,
          0,
          currentY,
          canvasWidth,
          sliceHeight,
          0,
          0,
          canvasWidth,
          sliceHeight
        );
      }

      const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const renderedSliceHeightMm = (sliceHeight / canvasWidth) * pdfWidth;

      pdf.addImage(
        sliceDataUrl,
        'JPEG',
        0,
        0,
        pdfWidth,
        renderedSliceHeightMm,
        undefined,
        'FAST'
      );

      currentY += sliceHeight;
      pageIndex++;
    }

    onProgress?.('Gerando arquivo final...');
    const pdfBlob = pdf.output('blob');
    console.log('[PDF] blob criado');
    console.log('[PDF] blob size:', pdfBlob.size);
    console.log('[PDF] blob type:', pdfBlob.type);

    if (pdfBlob.size === 0) {
      throw new Error("O PDF gerado está vazio (size 0)");
    }

    return pdfBlob;
  } catch (error) {
    console.error('[PDF EXPORT ERROR]', error);
    throw error;
  }
}
