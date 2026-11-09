import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Image as ImageIcon, 
  Trash2, 
  Calendar, 
  Columns, 
  Filter, 
  X, 
  Upload, 
  Sparkles,
  ArrowRight,
  ZoomIn
} from 'lucide-react';
import { Student, StudentPhoto, PhotoCategory } from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../db/indexedDB';
import { optimizeImageFile } from '../../utils/imageOptimizer';

interface EvolutionPhotosGalleryProps {
  student: Student;
}

const CATEGORIES: PhotoCategory[] = ['Frente', 'Lateral direita', 'Lateral esquerda', 'Costas', 'Outro'];

export const EvolutionPhotosGallery: React.FC<EvolutionPhotosGalleryProps> = ({ student }) => {
  const { photos, savePhoto, deletePhoto } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const studentPhotos = photos
    .filter(p => p.studentId === student.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New photo form state
  const [newPhotoData, setNewPhotoData] = useState<string>('');
  const [newCategory, setNewCategory] = useState<PhotoCategory>('Frente');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState<string>('');

  // Comparison State
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [beforePhotoId, setBeforePhotoId] = useState<string>('');
  const [afterPhotoId, setAfterPhotoId] = useState<string>('');
  const [comparisonCategory, setComparisonCategory] = useState<PhotoCategory>('Frente');

  // Zoom Modal
  const [zoomedPhoto, setZoomedPhoto] = useState<StudentPhoto | null>(null);

  const filteredPhotos = studentPhotos.filter(p => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const optimized = await optimizeImageFile(file, 1400, 0.85);
      setNewPhotoData(optimized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar imagem.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoData) {
      setErrorMessage('Por favor, selecione uma foto antes de salvar.');
      return;
    }

    const photoToSave: StudentPhoto = {
      id: generateId('photo'),
      studentId: student.id,
      photoUrl: newPhotoData,
      category: newCategory,
      date: newDate,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    await savePhoto(photoToSave);
    setShowAddModal(false);
    setNewPhotoData('');
    setNewNotes('');
    setNewDate(new Date().toISOString().split('T')[0]);
  };

  const beforePhoto = studentPhotos.find(p => p.id === beforePhotoId);
  const afterPhoto = studentPhotos.find(p => p.id === afterPhotoId);

  // Auto-fill comparison when entering compare mode
  const handleStartComparison = (cat: PhotoCategory = 'Frente') => {
    setComparisonCategory(cat);
    const catPhotos = studentPhotos
      .filter(p => p.category === cat)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (catPhotos.length >= 2) {
      setBeforePhotoId(catPhotos[0].id);
      setAfterPhotoId(catPhotos[catPhotos.length - 1].id);
    } else if (catPhotos.length === 1) {
      setBeforePhotoId(catPhotos[0].id);
      setAfterPhotoId(catPhotos[0].id);
    } else {
      setBeforePhotoId('');
      setAfterPhotoId('');
    }
    setIsComparing(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold font-display uppercase text-white">
            Fotos de Evolução Corporal
          </h3>
          <p className="text-xs text-[#4B5563]">
            Registros corporais históricos e comparações visuais de {student.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {studentPhotos.length >= 2 && (
            <button
              onClick={() => {
                if (isComparing) {
                  setIsComparing(false);
                } else {
                  handleStartComparison(comparisonCategory);
                }
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                isComparing
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white'
              }`}
            >
              <Columns className="w-4 h-4 text-[#374151]" />
              <span>{isComparing ? 'Fechar Comparador' : 'Comparar Antes / Depois'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setNewPhotoData('');
              setNewNotes('');
              setErrorMessage(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ ADICIONAR FOTO</span>
          </button>
        </div>
      </div>

      {/* COMPARISON VIEW */}
      {isComparing && (
        <div className="bg-[#121212] border-2 border-[#D1D5DB] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272A] pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#374151]" />
              <h4 className="text-base font-bold font-display uppercase text-white">
                Comparativo Visual de Evolução
              </h4>
            </div>

            {/* Category Selector for Comparison */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-[#4B5563] whitespace-nowrap">Ângulo:</span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleStartComparison(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    comparisonCategory === cat
                      ? 'bg-[#374151] text-white'
                      : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Selectors for Before and After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ANTES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-wider border border-zinc-700">
                  ANTES
                </span>
                <select
                  value={beforePhotoId}
                  onChange={e => setBeforePhotoId(e.target.value)}
                  className="bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#374151]"
                >
                  <option value="">Selecione uma foto...</option>
                  {studentPhotos
                    .filter(p => p.category === comparisonCategory)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {new Date(p.date).toLocaleDateString('pt-BR')} - {p.category}
                      </option>
                    ))}
                </select>
              </div>

              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden aspect-3/4 max-h-[420px] flex items-center justify-center relative">
                {beforePhoto ? (
                  <img
                    src={beforePhoto.photoUrl}
                    alt="Antes"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-[#4B5563] text-xs">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-80" />
                    <span>Nenhuma foto selecionada para o Antes</span>
                  </div>
                )}
                {beforePhoto && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 text-white">
                    <p className="text-xs font-bold">{new Date(beforePhoto.date).toLocaleDateString('pt-BR')}</p>
                    {beforePhoto.notes && <p className="text-[11px] text-zinc-300 line-clamp-1">{beforePhoto.notes}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* DEPOIS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-md bg-[#374151] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-xs">
                  DEPOIS
                </span>
                <select
                  value={afterPhotoId}
                  onChange={e => setAfterPhotoId(e.target.value)}
                  className="bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#374151]"
                >
                  <option value="">Selecione uma foto...</option>
                  {studentPhotos
                    .filter(p => p.category === comparisonCategory)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {new Date(p.date).toLocaleDateString('pt-BR')} - {p.category}
                      </option>
                    ))}
                </select>
              </div>

              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden aspect-3/4 max-h-[420px] flex items-center justify-center relative">
                {afterPhoto ? (
                  <img
                    src={afterPhoto.photoUrl}
                    alt="Depois"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-[#4B5563] text-xs">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-80" />
                    <span>Nenhuma foto selecionada para o Depois</span>
                  </div>
                )}
                {afterPhoto && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 text-white">
                    <p className="text-xs font-bold">{new Date(afterPhoto.date).toLocaleDateString('pt-BR')}</p>
                    {afterPhoto.notes && <p className="text-[11px] text-zinc-300 line-clamp-1">{afterPhoto.notes}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-[#374151] text-white shadow-md shadow-xs'
              : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
          }`}
        >
          Todas ({studentPhotos.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = studentPhotos.filter(p => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#374151] text-white shadow-md shadow-xs'
                  : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* PHOTOS GRID */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredPhotos.map(photo => (
            <div
              key={photo.id}
              className="bg-[#121212] border border-[#27272a] hover:border-white/20 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-lg transition-all"
            >
              {/* Photo Image with Hover Zoom */}
              <div 
                onClick={() => setZoomedPhoto(photo)}
                className="aspect-3/4 bg-[#18181B] relative overflow-hidden cursor-pointer"
              >
                <img
                  src={photo.photoUrl}
                  alt={`${photo.category} - ${photo.date}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
                </div>
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-black text-white uppercase tracking-wider">
                  {photo.category}
                </span>
              </div>

              {/* Card Footer */}
              <div className="p-3 bg-[#121212] border-t border-[#27272A] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block">
                    {new Date(photo.date).toLocaleDateString('pt-BR')}
                  </span>
                  {photo.notes && (
                    <span className="text-[10px] text-[#4B5563] truncate block" title={photo.notes}>
                      {photo.notes}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Deseja excluir esta foto de ${photo.category} (${new Date(photo.date).toLocaleDateString('pt-BR')})?`)) {
                      await deletePhoto(photo.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-[#4B5563] hover:text-[#1F2937] hover:bg-[#27272A] transition-all shrink-0"
                  title="Excluir foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#121212] border-2 border-dashed border-[#27272a] rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#18181B] border border-white/5 flex items-center justify-center text-[#374151]">
            <ImageIcon className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Nenhum registro fotográfico nesta categoria</h4>
            <p className="text-xs text-[#4B5563] mt-1 max-w-sm">
              Tire ou importe fotos de acompanhamento corporal (Frente, Costas, Laterais) para registrar a evolução física do aluno.
            </p>
          </div>
          <button
            onClick={() => {
              setNewPhotoData('');
              setNewNotes('');
              setErrorMessage(null);
              setShowAddModal(true);
            }}
            className="mt-2 px-6 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>ADICIONAR PRIMEIRA FOTO</span>
          </button>
        </div>
      )}

      {/* ADD PHOTO MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272a] rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-display uppercase text-white">
                Adicionar Foto de Evolução
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-[#18181B] text-[#4B5563] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4 text-xs">
              {/* Photo Upload Box */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {newPhotoData ? (
                  <div className="relative aspect-3/4 max-h-64 rounded-2xl overflow-hidden bg-[#18181B] border border-[#27272A]">
                    <img
                      src={newPhotoData}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-xs text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 hover:bg-black"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Trocar</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full aspect-3/4 max-h-56 rounded-2xl bg-[#18181B] border-2 border-dashed border-[#27272A] hover:border-[#374151] transition-all flex flex-col items-center justify-center p-6 text-center group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#27272A] flex items-center justify-center text-[#4B5563] group-hover:text-[#1F2937] transition-colors mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white text-sm mb-1">
                      {isProcessing ? 'Otimizando imagem...' : 'Selecionar ou Tirar Foto'}
                    </span>
                    <span className="text-[11px] text-[#4B5563]">
                      Formatos JPG, PNG ou WEBP suportados
                    </span>
                  </button>
                )}
              </div>

              {/* Category Picker */}
              <div>
                <label className="block text-white font-bold mb-1">Posição / Ângulo *</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as PhotoCategory)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-white font-bold mb-1">Data do Registro *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                >
                </input>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-white font-bold mb-1">Observações (opcional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Ex: Em jejum, iluminação natural, pós-treino..."
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-red-400 p-2.5 bg-red-950/40 rounded-xl border border-red-800">
                  {errorMessage}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#18181B] border border-[#27272A] text-white font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newPhotoData || isProcessing}
                  className="flex-1 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-white font-bold shadow-md shadow-xs"
                >
                  Salvar Foto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ZOOM MODAL */}
      {zoomedPhoto && (
        <div 
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="max-w-2xl w-full bg-[#121212] border border-zinc-800 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col"
          >
            <div className="p-4 bg-black/80 flex items-center justify-between border-b border-zinc-800">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-[#374151] text-white font-bold text-[10px] uppercase">
                  {zoomedPhoto.category}
                </span>
                <span className="text-xs text-zinc-300 ml-2 font-bold">
                  {new Date(zoomedPhoto.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={zoomedPhoto.photoUrl}
                alt={zoomedPhoto.category}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>

            {zoomedPhoto.notes && (
              <div className="p-4 bg-[#18181B] text-xs text-zinc-300 border-t border-zinc-800">
                <span className="font-bold text-white block mb-0.5">Observações:</span>
                <p>{zoomedPhoto.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
