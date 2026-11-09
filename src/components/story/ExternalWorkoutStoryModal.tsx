import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileImage, 
  Trash2, 
  Eye, 
  ArrowRight, 
  Info,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  Layers,
  Sparkles,
  ExternalLink,
  ZoomIn
} from 'lucide-react';
import { ExternalStoryData } from '../../types';

interface ExternalWorkoutStoryModalProps {
  initialData?: ExternalStoryData;
  onClose: () => void;
  onSubmit: (data: ExternalStoryData) => void;
}

export const ExternalWorkoutStoryModal: React.FC<ExternalWorkoutStoryModalProps> = ({
  initialData,
  onClose,
  onSubmit
}) => {
  // Form state
  const [studentName, setStudentName] = useState(initialData?.studentName || '');
  const [workoutName, setWorkoutName] = useState(initialData?.workoutName || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(initialData?.duration || '');
  const [exerciseCount, setExerciseCount] = useState(initialData?.exerciseCount ? String(initialData.exerciseCount) : '');
  const [setCount, setSetCount] = useState(initialData?.setCount ? String(initialData.setCount) : '');
  const [volume, setVolume] = useState(initialData?.volume ? String(initialData.volume) : '');
  const [calories, setCalories] = useState(initialData?.calories ? String(initialData.calories) : '');
  const [highlight, setHighlight] = useState(initialData?.highlight || '');
  const [originApp, setOriginApp] = useState(initialData?.originApp || 'MFit');
  const [showOrigin, setShowOrigin] = useState(initialData?.showOrigin ?? false);
  const [printImage, setPrintImage] = useState<string | undefined>(initialData?.printImage);

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [showFullPrint, setShowFullPrint] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection (PNG, JPG, JPEG)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, JPEG).');
      return;
    }
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPrintImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setPrintImage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if at least some data or an image is provided
    const hasAnyField = Boolean(
      studentName.trim() ||
      workoutName.trim() ||
      duration.trim() ||
      exerciseCount.trim() ||
      setCount.trim() ||
      volume.trim() ||
      calories.trim() ||
      highlight.trim() ||
      printImage
    );

    if (!hasAnyField) {
      setErrorMessage('Preencha ao menos um dado do treino ou anexe o print para continuar.');
      return;
    }

    const payload: ExternalStoryData = {
      source: 'external',
      studentName: studentName.trim(),
      workoutName: workoutName.trim(),
      date,
      duration: duration.trim(),
      exerciseCount: exerciseCount.trim() ? parseInt(exerciseCount.replace(/\D/g, ''), 10) || undefined : undefined,
      setCount: setCount.trim() ? parseInt(setCount.replace(/\D/g, ''), 10) || undefined : undefined,
      volume: volume.trim(),
      calories: calories.trim() ? parseInt(calories.replace(/\D/g, ''), 10) || undefined : undefined,
      highlight: highlight.trim(),
      originApp: originApp.trim(),
      showOrigin,
      printImage
    };

    onSubmit(payload);
  };

  return (
    <div 
      id="external-story-generator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
    >
      <div 
        className="bg-zinc-950 border border-zinc-800/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500 font-black">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white uppercase">
                  Story de Treino Externo
                </h2>
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                  Gerador Visual
                </span>
              </div>
              <p className="text-xs text-zinc-600">
                Monte o Story oficial TFIVE a partir de treinos realizados fora (MFit, Strava, etc.)
              </p>
            </div>
          </div>
          <button
            id="close-external-story-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center gap-2 text-xs text-zinc-600">
          <Info className="w-4 h-4 text-zinc-300 shrink-0" />
          <span>
            <strong className="text-zinc-200">Apenas Gerador Visual:</strong> Este processo não cria sessões, não altera histórico nem afeta métricas do sistema.
          </span>
        </div>

        {/* Modal Body - 2 Columns on Desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Manual Form (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Row 1: Aluno & Nome do Treino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nome do Aluno <span className="text-zinc-600 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="ext-student-name-input"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ex: Carlos"
                    className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nome do Treino <span className="text-zinc-600 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="ext-workout-name-input"
                    type="text"
                    value={workoutName}
                    onChange={(e) => setWorkoutName(e.target.value)}
                    placeholder="Ex: Treino A - Peito e Tríceps"
                    className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Data & Duração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Data do Treino <span className="text-zinc-600 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="ext-date-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Duração <span className="text-zinc-600 font-normal">(ex: 45 min, 1h 10m)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="ext-duration-input"
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="Ex: 52 MIN"
                      className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    />
                    <Clock className="w-4 h-4 text-zinc-600 absolute right-3.5 top-3" />
                  </div>
                </div>
              </div>

              {/* Row 3: Exercícios & Séries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Qtd. Exercícios <span className="text-zinc-600 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="ext-exercise-count-input"
                      type="number"
                      min="0"
                      value={exerciseCount}
                      onChange={(e) => setExerciseCount(e.target.value)}
                      placeholder="Ex: 7"
                      className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    />
                    <Dumbbell className="w-4 h-4 text-zinc-600 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Séries Totais <span className="text-zinc-400 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="ext-set-count-input"
                      type="number"
                      min="0"
                      value={setCount}
                      onChange={(e) => setSetCount(e.target.value)}
                      placeholder="Ex: 24"
                      className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    />
                    <Layers className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3" />
                  </div>
                </div>
              </div>

              {/* Row 4: Volume & Calorias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Volume Total <span className="text-zinc-400 font-normal">(ex: 12.500 kg ou 12,5 T)</span>
                  </label>
                  <input
                    id="ext-volume-input"
                    type="text"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="Ex: 14.850 KG"
                    className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Calorias <span className="text-zinc-400 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="ext-calories-input"
                      type="text"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      placeholder="Ex: 420 KCAL"
                      className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                    />
                    <Flame className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3" />
                  </div>
                </div>
              </div>

              {/* Row 5: Destaque do Treino / Observação */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Destaque do Treino / Observação <span className="text-zinc-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <input
                    id="ext-highlight-input"
                    type="text"
                    value={highlight}
                    onChange={(e) => setHighlight(e.target.value)}
                    placeholder="Ex: Supino 100kg • PR Batido • Treino Intenso"
                    className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                  <Sparkles className="w-4 h-4 text-amber-500/70 absolute right-3.5 top-3" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Aparece em destaque visual ou nos modelos PR e Minimal.
                </p>
              </div>

              {/* Row 6: Origem e Checkbox Mostrar Origem */}
              <div className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-zinc-300">Origem:</label>
                    <div className="flex items-center gap-1.5">
                      {['MFit', 'Strava', 'Garmin', 'Outro'].map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setOriginApp(app)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                            originApp === app 
                              ? 'bg-red-600 text-white shadow-sm' 
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="ext-show-origin-checkbox"
                      type="checkbox"
                      checked={showOrigin}
                      onChange={(e) => setShowOrigin(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-red-600 focus:ring-red-500 focus:ring-offset-zinc-900"
                    />
                    <span className="text-xs text-zinc-300">
                      Mostrar etiqueta de origem no Story
                    </span>
                  </label>
                </div>
              </div>

              {/* Error message if any */}
              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-400">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Right Column: Print Image Upload & Side-by-Side Reference (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <FileImage className="w-4 h-4 text-zinc-400" />
                  Print de Referência <span className="text-zinc-400 font-normal">(opcional)</span>
                </label>
                {printImage && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFullPrint(true)}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                      title="Ampliar print"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      Ampliar
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      title="Remover print"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileChange}
                className="hidden"
                id="ext-print-file-input"
              />

              {/* Upload Drop Zone or Image Preview Container */}
              {!printImage ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 min-h-[220px] lg:min-h-[380px] border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-6 h-6 text-zinc-300" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-200 mb-1">
                    Anexar print do treino
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-[240px] mb-3">
                    Arraste o print do MFit ou Strava aqui ou clique para selecionar (PNG, JPG).
                  </p>
                  <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg">
                    Consulte os números lado a lado
                  </span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[260px] lg:min-h-[380px]">
                  {/* Image viewport with scroll and inspect */}
                  <div 
                    className="flex-1 relative flex items-center justify-center p-2 bg-zinc-950/60 overflow-hidden cursor-pointer group"
                    onClick={() => setShowFullPrint(true)}
                  >
                    <img
                      src={printImage}
                      alt="Print de referência"
                      className="max-h-[340px] w-auto object-contain rounded-lg border border-zinc-800 shadow-md group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-zinc-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg border border-zinc-700">
                        <ZoomIn className="w-4 h-4" /> Clique para ampliar
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer below image */}
                  <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Print anexado como guia</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-zinc-300 hover:text-white font-medium hover:underline"
                    >
                      Trocar print
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="lg:col-span-12 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-400 text-center sm:text-left">
                Os campos em branco serão omitidos automaticamente nos modelos de Story.
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-700/80 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="submit-external-story-btn"
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
                >
                  <span>Continuar para o Story</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>

      {/* Full Print Zoom Modal */}
      {showFullPrint && printImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setShowFullPrint(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setShowFullPrint(false)}
              className="p-2.5 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 transition-colors"
              title="Fechar zoom"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <img
            src={printImage}
            alt="Print em tela cheia"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
