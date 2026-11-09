import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  ArrowLeft, 
  LayoutGrid, 
  Dumbbell, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  Layers
} from 'lucide-react';
import { WorkoutSession, ExternalStoryData } from '../../types';
import { useApp } from '../../context/AppContext';
import { WorkoutStoryDOMRenderer, DOMStoryTemplateId, StoryDOMRendererRef } from './WorkoutStoryDOMRenderer';
import { downloadBlob, shareOrDownloadFile } from '../../utils/fileDownloadService';
import { formatWorkoutDuration } from '../../utils/calculations';

interface WorkoutStoryModalProps {
  session?: WorkoutSession | null;
  externalData?: ExternalStoryData | null;
  onClose: () => void;
  onEditExternalData?: () => void;
}

type ModalViewMode = 'gallery' | 'preview';

export interface StoryTemplateItem {
  id: DOMStoryTemplateId;
  number: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  tag: string;
}

export const STORY_TEMPLATES: StoryTemplateItem[] = [
  { id: 'clean_card', number: '01', name: 'WORKOUT CLEAN', slug: 'workout-clean', subtitle: 'Foto, treino e métricas essenciais', description: 'Fotografia em primeiro plano, tipografia refinada e apenas duração e volume.', tag: 'CLEAN' },
  { id: 'body_map', number: '02', name: 'MAPA ANATÔMICO', slug: 'mapa-anatomico', subtitle: 'Grupamentos musculares trabalhados', description: 'Vistas anatômicas frontal e posterior com músculos primários e secundários destacados.', tag: 'ANATOMIA' }
];

export const WorkoutStoryModal: React.FC<WorkoutStoryModalProps> = ({
  session,
  externalData,
  onClose
}) => {
  const { exercises } = useApp();

  const effectiveSession: WorkoutSession = useMemo(() => {
    if (session) return session;
    const nowStr = new Date().toISOString();
    return {
      id: `ext-${Date.now()}`,
      studentId: 'ext-student',
      studentName: externalData?.studentName || '',
      routineTitle: externalData?.workoutName || 'Treino Concluído',
      routineName: externalData?.workoutName || 'Treino Concluído',
      startTime: externalData?.date || nowStr,
      endTime: externalData?.date || nowStr,
      status: 'completed',
      durationSeconds: 0,
      totalVolume: 0,
      totalSets: Number(externalData?.setCount || 0),
      prsAchieved: [],
      sets: Array.from({ length: Number(externalData?.setCount || 0) }).map((_, i) => ({
        id: `s-${i}`,
        exerciseId: `e-${i}`,
        weight: 0,
        reps: 0
      })) as any
    };
  }, [session, externalData]);

  const [viewMode, setViewMode] = useState<ModalViewMode>('preview');
  const [selectedTemplate, setSelectedTemplate] = useState<DOMStoryTemplateId>('clean_card');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [previewBg, setPreviewBg] = useState<'photo' | 'transparent'>('photo');
  const [photoBackground, setPhotoBackground] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  const rendererRef = useRef<StoryDOMRendererRef>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setPhotoBackground(reader.result); };
    reader.readAsDataURL(file);
  };

  const currentTemplate = useMemo(() => {
    return STORY_TEMPLATES.find(t => t.id === selectedTemplate) || STORY_TEMPLATES[0];
  }, [selectedTemplate]);

  const studentName = effectiveSession.studentName || 'Aluno';

  const handleSelectTemplate = (id: DOMStoryTemplateId) => {
    setSelectedTemplate(id);
    setViewMode('preview');
  };

  const handleExport = async (action: 'download' | 'share') => {
    if (!rendererRef.current || isExporting) return;

    try {
      setIsExporting(true);
      setExportSuccessMsg(null);
      setExportErrorMsg(null);

      const blob = await rendererRef.current.exportToBlob();

      // Ensure exact filename format: story-tfive-[modelo]-[data].png
      const sessionDate = effectiveSession.startTime ? new Date(effectiveSession.startTime) : new Date();
      const datePart = sessionDate.toISOString().split('T')[0];
      const filename = `story-tfive-${currentTemplate.slug}-${datePart}.png`;

      if (action === 'share') {
        await shareOrDownloadFile({
          blob,
          filename,
          title: `TFIVE PRO - ${currentTemplate.name}`,
          text: `Treino concluído: ${effectiveSession.routineName || 'TFIVE PRO'}`
        });
      } else {
        // iOS Safari/PWA nem sempre respeita o atributo download em URLs Blob.
        // Nesses dispositivos, abrir a folha nativa de compartilhamento permite Salvar em Fotos/Arquivos.
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIOS) {
          const result = await shareOrDownloadFile({
            blob,
            filename,
            title: `TFIVE PRO - ${currentTemplate.name}`,
            text: `Mapa e resumo do treino: ${effectiveSession.routineName || 'TFIVE PRO'}`
          });
          if (result.method === 'web_share') {
            setExportSuccessMsg('PNG pronto. Na tela de compartilhamento, escolha Salvar em Arquivos ou Salvar Imagem.');
          } else {
            setExportSuccessMsg('PNG enviado para download. Verifique Arquivos/Downloads.');
          }
        } else {
          downloadBlob(blob, filename);
          setExportSuccessMsg('PNG 1080×1920 enviado para download.');
        }
        setTimeout(() => setExportSuccessMsg(null), 6000);
      }
    } catch (err) {
      console.error('[STORY EXPORT ERROR]', err);
      setExportErrorMsg(err instanceof Error ? `Falha ao gerar PNG: ${err.message}` : 'Falha ao gerar o PNG. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-6xl w-full my-4 flex flex-col max-h-[96vh] shadow-2xl overflow-hidden text-white">
        
        {/* Header Superior */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95 shrink-0">
          <div className="flex items-center gap-3">
            {viewMode === 'preview' ? (
              <button
                onClick={() => setViewMode('gallery')}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wider"
                title="Ver todos os modelos"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Galeria</span>
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shadow-xs">
                <LayoutGrid className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-nums font-bold tracking-[0.2em] text-zinc-400 uppercase">
                  TFIVE PRO 1
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-500" />
                <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase">
                  STORIES • CLEAN & ANATÔMICO
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                {viewMode === 'gallery'
                  ? 'Stories de Treino'
                  : `${currentTemplate.number} ${currentTemplate.name} • ${currentTemplate.subtitle}`}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* MODO GALERIA: Grade com os 7 Modelos                             */}
        {/* ================================================================= */}
        {viewMode === 'gallery' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-900/40">
            {/* Cabeçalho da Sessão */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between flex-wrap gap-4 shadow-sm mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-black text-white uppercase">
                    {(effectiveSession.routineName || 'Treino Concluído').toUpperCase()}
                  </p>
                  <p className="text-xs font-medium text-zinc-400 font-mono-nums">
                    {studentName} • {formatWorkoutDuration(effectiveSession.durationSeconds || 0)}
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono-nums font-bold text-zinc-400 uppercase tracking-widest bg-zinc-800/60 px-3 py-1.5 rounded-full border border-zinc-700">
                2 MODELOS • PNG 1080×1920
              </div>
            </div>

            {/* Grid dos 7 Modelos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {STORY_TEMPLATES.map(tmpl => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`group relative flex flex-row sm:flex-col bg-zinc-900/90 rounded-2xl border ${
                      isSelected
                        ? 'border-white shadow-xl ring-2 ring-white/30'
                        : 'border-zinc-800 hover:border-zinc-600'
                    } overflow-hidden transition-all text-left hover:scale-[1.01]`}
                  >
                    {/* Thumbnail 9:16 com preview renderizado */}
                    <div 
                      className="w-28 sm:w-full shrink-0 aspect-[9/16] relative overflow-hidden pointer-events-none bg-zinc-950 border-r sm:border-r-0 sm:border-b border-zinc-800"
                      style={{ 
                        containerType: 'inline-size',
                        backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1080&auto=format&fit=crop)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      } as any}
                    >
                      {/* Dark overlay for contrast */}
                      <div className="absolute inset-0 bg-black/40" />

                      {/* Escala real do modelo */}
                      <div 
                        className="absolute top-0 left-0 origin-top-left" 
                        style={{ width: 1080, height: 1920, transform: 'scale(calc(100cqw / 1080))' }}
                      >
                        <WorkoutStoryDOMRenderer 
                          session={effectiveSession}
                          templateId={tmpl.id}
                          studentName={studentName}
                          exercises={exercises} backgroundImageUrl={photoBackground}
                        />
                      </div>

                      {/* Badge do número no topo da miniatura */}
                      <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono-nums font-black text-white border border-white/20">
                        {tmpl.number}
                      </div>
                    </div>

                    {/* Metadados do Modelo */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono-nums font-black px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase tracking-widest border border-zinc-700">
                            {tmpl.tag}
                          </span>
                          <span className="text-xs font-mono-nums font-bold text-zinc-500">
                            {tmpl.number}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white uppercase tracking-wide group-hover:text-zinc-200">
                          {tmpl.name}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-400 group-hover:text-white">
                        <span>SELECIONAR</span>
                        <span>→</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // =================================================================
          // MODO PREVIEW: Visualização Direta e Seletor dos 7 Modelos
          // =================================================================
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-950">
            {/* Hidden DOM Renderer para exportação em tamanho físico de 1080x1920 */}
            <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" aria-hidden="true">
              <WorkoutStoryDOMRenderer 
                ref={rendererRef}
                session={effectiveSession}
                templateId={selectedTemplate}
                studentName={studentName}
                exercises={exercises}
              />
            </div>

            {/* Painel Central de Preview */}
            <div className="flex-1 flex flex-col bg-zinc-900/60 relative overflow-y-auto">
              {/* Seletor Visual Rápido dos 7 Modelos no Topo do Preview */}
              <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {STORY_TEMPLATES.map(tmpl => {
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-white text-zinc-950 shadow-md scale-[1.02]'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/60'
                        }`}
                      >
                        <span className={`font-mono-nums text-[10px] px-1 rounded ${isSelected ? 'bg-zinc-900 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                          {tmpl.number}
                        </span>
                        <span>{tmpl.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Área do Preview com Toggle de Fundo */}
              <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelection} className="hidden" />
                  <button onClick={() => photoInputRef.current?.click()} className="px-4 py-2.5 rounded-xl bg-white text-zinc-900 text-xs font-semibold tracking-wide">ESCOLHER FOTO</button>
                  {photoBackground && <button onClick={() => setPhotoBackground(null)} className="px-3 py-2.5 rounded-xl border border-zinc-600 text-zinc-300 text-xs">REMOVER FOTO</button>}
                </div>
                {/* Controles de Fundo da Prévia */}
                <div className="mb-6 flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1 shadow-md">
                  <button
                    onClick={() => setPreviewBg('photo')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      previewBg === 'photo'
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sobre Foto</span>
                  </button>
                  <button
                    onClick={() => setPreviewBg('transparent')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      previewBg === 'transparent'
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Fundo Transparente</span>
                  </button>
                </div>

                {/* Canvas do Story na proporção 9:16 */}
                <div 
                  className="relative shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden shrink-0 transition-all w-[min(52vw,260px)] h-auto aspect-[9/16] max-w-full border border-white/10" 
                  style={{ 
                    containerType: 'inline-size',
                    backgroundImage: previewBg === 'photo' && photoBackground ? 'url(' + photoBackground + ')' : 'repeating-conic-gradient(#27272A 0% 25%, transparent 0% 50%)',
                    backgroundSize: previewBg === 'transparent' || !photoBackground ? '20px 20px' : 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: previewBg === 'transparent' || !photoBackground ? '#18181B' : 'transparent'
                  } as any}
                >
                  {/* Foto escurecida levemente para legibilidade ótica */}
                  {previewBg === 'photo' && photoBackground && (
                    <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                  )}

                  {/* Renderizador DOM em escala proporcional */}
                  <div 
                    className="absolute top-0 left-0 origin-top-left pointer-events-none" 
                    style={{ width: 1080, height: 1920, transform: 'scale(calc(100cqw / 1080))' }}
                  >
                    <WorkoutStoryDOMRenderer 
                      session={effectiveSession}
                      templateId={selectedTemplate}
                      studentName={studentName}
                      exercises={exercises}
                    />
                  </div>
                </div>

                {/* Legenda Informativa */}
                <p className="text-[11px] font-mono-nums text-zinc-500 uppercase tracking-widest mt-4 text-center">
                  1080 × 1920 PX • PNG • PRONTO PARA COMPARTILHAR
                </p>
              </div>
            </div>

            {/* Sidebar Lateral de Ações e Exportação */}
            <div className="w-full md:w-80 bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col shrink-0 overflow-y-auto z-10">
              <div className="p-6 border-b border-zinc-800 bg-zinc-950/40">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono-nums text-xs font-black text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {currentTemplate.number}
                  </span>
                  <span className="text-xs font-mono-nums font-bold text-zinc-400 uppercase tracking-widest">
                    {currentTemplate.tag}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  {currentTemplate.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {currentTemplate.description}
                </p>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  {/* Nome do Arquivo de Saída */}
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-mono-nums text-zinc-500 uppercase tracking-wider block mb-1">
                      Arquivo de Saída
                    </span>
                    <span className="text-xs font-mono-nums font-bold text-zinc-300 break-all">
                      story-tfive-{currentTemplate.slug}-{(effectiveSession.startTime ? new Date(effectiveSession.startTime) : new Date()).toISOString().split('T')[0]}.png
                    </span>
                  </div>

                  {/* Feedback de Sucesso */}
                  {exportSuccessMsg && (
                    <div className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-xs font-bold flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                      <span>{exportSuccessMsg}</span>
                    </div>
                  )}

                  {exportErrorMsg && (
                    <div role="alert" className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-100 text-xs font-semibold">
                      {exportErrorMsg}
                    </div>
                  )}

                  {/* Botão Primário: BAIXAR PNG */}
                  <button
                    onClick={() => handleExport('download')}
                    disabled={isExporting}
                    className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-black font-display text-sm tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>GERANDO PNG...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>BAIXAR PNG</span>
                      </>
                    )}
                  </button>

                  {/* Botão Secundário: COMPARTILHAR */}
                  <button
                    onClick={() => handleExport('share')}
                    disabled={isExporting}
                    className="w-full py-3.5 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-white font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>COMPARTILHAR</span>
                  </button>
                </div>

                {/* Especificações Técnicas */}
                <div className="pt-4 border-t border-zinc-800/80 space-y-2 text-[11px] font-mono-nums text-zinc-500">
                  <div className="flex justify-between">
                    <span>RESOLUÇÃO</span>
                    <span className="text-zinc-300 font-bold">1080 × 1920</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CANAL ALPHA</span>
                    <span className="text-zinc-300 font-bold">PRESERVADO (0)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ESTILO</span>
                    <span className="text-zinc-300 font-bold">MINIMALISTA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
