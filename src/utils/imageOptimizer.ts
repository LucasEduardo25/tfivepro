/**
 * Image processing & optimization utility for TFIVE PRO.
 * Resizes and compresses photos 100% locally in the browser/PWA.
 * Decodes orientation and prevents giant file sizes in IndexedDB.
 */

export async function optimizeImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida (use JPG, PNG ou WEBP).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Compute proportional resize
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original data URL if canvas context fails
            resolve(event.target?.result as string);
            return;
          }

          // Smooth resampling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Try webp first, fallback to jpeg
          try {
            const webpData = canvas.toDataURL('image/webp', quality);
            if (webpData && webpData.startsWith('data:image/webp')) {
              resolve(webpData);
              return;
            }
          } catch {
            // Fallback to jpeg
          }

          const jpegData = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegData);
        } catch (err) {
          console.warn('Canvas optimization error, using original read:', err);
          resolve(event.target?.result as string);
        }
      };

      img.onerror = () => {
        reject(new Error('Falha ao decodificar imagem. Verifique se o formato é suportado.'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo local.'));
    };

    reader.readAsDataURL(file);
  });
}
