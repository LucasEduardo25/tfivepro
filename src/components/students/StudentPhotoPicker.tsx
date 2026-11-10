import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw, Upload } from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';
import { optimizeImageFile } from '../../utils/imageOptimizer';

interface StudentPhotoPickerProps {
  photoUrl?: string;
  studentName: string;
  onPhotoChange: (dataUrl: string) => void;
  onPhotoRemove: () => void;
  className?: string;
  label?: string;
}

export const StudentPhotoPicker: React.FC<StudentPhotoPickerProps> = ({
  photoUrl,
  studentName,
  onPhotoChange,
  onPhotoRemove,
  className = '',
  label = 'Foto de Perfil do Aluno'
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers onChange
    e.target.value = '';
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const optimized = await optimizeImageFile(file, 1200, 0.85);
      onPhotoChange(optimized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar imagem selecionada.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerUpload = () => {
    setErrorMessage(null);
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setErrorMessage(null);
    onPhotoRemove();
  };

  return (
    <div className={`bg-[#18181B] border border-[#27272A] rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">
          {label}
        </label>
        <span className="text-[10px] text-[#4B5563]">JPG, PNG ou WEBP (nuvem privada)</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Visual Preview */}
        <div className="relative group shrink-0">
          <StudentAvatar
            name={studentName || 'Aluno'}
            photo={photoUrl}
            size="xl"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-[#27272A] group-hover:border-[#374151] transition-all shadow-lg"
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center backdrop-blur-xs">
              <RefreshCw className="w-6 h-6 text-[#374151] animate-spin" />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-1 w-full flex flex-col justify-center space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex flex-wrap items-center gap-2">
            {!photoUrl ? (
              <button
                type="button"
                onClick={handleTriggerUpload}
                disabled={isProcessing}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-xs"
              >
                <Camera className="w-4 h-4" />
                <span>ADICIONAR FOTO</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3f3f46] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/10"
                >
                  <Upload className="w-3.5 h-3.5 text-[#374151]" />
                  <span>ALTERAR FOTO</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isProcessing}
                  className="px-3.5 py-2.5 rounded-xl bg-[#27272A]/80 hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/5"
                  title="Remover foto do aluno"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>REMOVER</span>
                </button>
              </>
            )}
          </div>

          <p className="text-[11px] text-[#4B5563] leading-relaxed">
            {photoUrl 
              ? 'Foto sincronizada com segurança na nuvem. Redimensionamento otimizado para o perfil e relatórios.'
              : 'Adicione uma foto do aluno para identificação visual nas listas, treinos e capa do relatório. O arquivo será armazenado na nuvem privada da sua organização.'}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}
    </div>
  );
};
