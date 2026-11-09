/**
 * TFIVE PRO - File Download & Sharing Utility
 * Reliable file downloading across Android Tablet, Mobile, Desktop & PWA
 */

/**
 * Sanitizes a filename to ensure complete compatibility across OS, browsers and filesystems
 * Removes diacritics (acentos), invalid characters, and replaces spaces with underscores.
 */
export function sanitizeFilename(filename: string): string {
  // Separate name and extension if present
  const lastDotIndex = filename.lastIndexOf('.');
  let baseName = lastDotIndex > -1 ? filename.substring(0, lastDotIndex) : filename;
  const ext = lastDotIndex > -1 ? filename.substring(lastDotIndex) : '';

  // Remove accents / diacritics
  baseName = baseName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Replace spaces and consecutive underscores/hyphens
  baseName = baseName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!baseName) {
    baseName = 'documento_tfive';
  }

  return `${baseName}${ext}`;
}

/**
 * Generates an official TFIVE report / export filename
 * Example: TFIVE_Avaliacao_Carlos_Eduardo_2026-09-13.pdf
 */
export function buildTFIVEFilename(
  category: 'Avaliacao' | 'Evolucao' | 'Treino' | 'Longevidade' | 'Proposta' | 'Story' | 'Relatorio',
  studentName?: string,
  dateStr?: string,
  extension: 'pdf' | 'png' = 'pdf'
): string {
  const safeStudent = (studentName || 'Aluno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_');

  const safeDate = dateStr 
    ? dateStr.split('T')[0] 
    : new Date().toISOString().split('T')[0];

  const rawFilename = `TFIVE_${category}_${safeStudent}_${safeDate}.${extension}`;
  return sanitizeFilename(rawFilename);
}

/**
 * Triggers a direct file download from a Blob
 * Works reliably on Android Tablet, Phone, Desktop, and PWA
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const cleanFilename = sanitizeFilename(filename);
  console.log(`[DOWNLOAD] Preparando blob URL para ${cleanFilename}. Tamanho: ${blob.size}, Tipo: ${blob.type}`);
  
  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = blobUrl;
  anchor.download = cleanFilename;
  anchor.rel = 'noopener noreferrer';

  // Attach to body for maximum browser/PWA compatibility
  document.body.appendChild(anchor);

  try {
    console.log('[DOWNLOAD] Disparando clique no anchor tag.');
    anchor.click();
    console.log('[DOWNLOAD] Clique disparado com sucesso.');
  } catch (err) {
    // Fallback if click is blocked: try window.open
    console.error('[TFIVE Download] Falha no clique padrão, tentando window.open:', err);
    window.open(blobUrl, '_blank');
  } finally {
    // Remove node from DOM
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }

    // Keep object URL alive for 45 seconds to allow Android Download Manager / iOS WebKit to read stream
    setTimeout(() => {
      console.log(`[DOWNLOAD] Revogando object URL para ${cleanFilename}`);
      URL.revokeObjectURL(blobUrl);
    }, 45000);
  }
}

/**
 * Shares a file using the Web Share API if supported by the browser/OS,
 * with fallback to direct download.
 */
export async function shareOrDownloadFile(options: {
  blob: Blob;
  filename: string;
  title: string;
  text?: string;
}): Promise<{ shared: boolean; method: 'web_share' | 'download' }> {
  const cleanFilename = sanitizeFilename(options.filename);

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([options.blob], cleanFilename, { type: options.blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: options.title,
          text: options.text || options.title
        });
        return { shared: true, method: 'web_share' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'web_share' };
      }
      console.warn('[TFIVE Share] Share error, falling back to download:', err);
    }
  }

  // Fallback to direct download
  downloadBlob(options.blob, cleanFilename);
  return { shared: true, method: 'download' };
}
