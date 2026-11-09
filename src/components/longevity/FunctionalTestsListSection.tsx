import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Play, 
  Layers, 
  Info, 
  ShieldCheck, 
  Dumbbell, 
  Clock, 
  Activity,
  Award,
  ChevronRight,
  Sparkles,
  HeartPulse,
  Scale
} from 'lucide-react';
import { 
  FunctionalTest, 
  FunctionalBattery, 
  FunctionalDomain, 
  Student 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../db/indexedDB';
import { soundEffects } from '../../utils/audio';

interface FunctionalTestsListSectionProps {
  student: Student;
  onSelectTestToRun: (test: FunctionalTest) => void;
  onSelectBatteryToRun: (battery: FunctionalBattery) => void;
}

export const FunctionalTestsListSection: React.FC<FunctionalTestsListSectionProps> = ({
  student,
  onSelectTestToRun,
  onSelectBatteryToRun
}) => {
  const { functionalTests, functionalBatteries, saveFunctionalTest } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isCustomTestModalOpen, setIsCustomTestModalOpen] = useState<boolean>(false);

  // Custom Test Form State
  const [newTestName, setNewTestName] = useState<string>('');
  const [newTestShortName, setNewTestShortName] = useState<string>('');
  const [newTestDomain, setNewTestDomain] = useState<FunctionalDomain>('strength');
  const [newTestUnit, setNewTestUnit] = useState<'reps' | 'seconds' | 'kg' | 'meters' | 'levels' | 'm/s'>('reps');
  const [newTestUnitLabel, setNewTestUnitLabel] = useState<string>('repetições');
  const [newTestDirection, setNewTestDirection] = useState<'higher_is_better' | 'lower_is_better'>('higher_is_better');
  const [newTestInstructions, setNewTestInstructions] = useState<string>('');
  const [newTestEquipment, setNewTestEquipment] = useState<string>('');

  // Filtered Tests
  const filteredTests = functionalTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDomain = selectedDomain === 'all' || test.domain === selectedDomain;

    return matchesSearch && matchesDomain;
  });

  const handleCreateCustomTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim()) return;

    soundEffects.playSuccess();
    const customTest: FunctionalTest = {
      id: generateId('ftest-custom'),
      name: newTestName.trim(),
      shortName: newTestShortName.trim() || newTestName.trim().slice(0, 15),
      domain: newTestDomain,
      category: 'Teste Personalizado',
      description: 'Protocolo de avaliação funcional cadastrado pelo Personal Trainer.',
      instructions: newTestInstructions.split('\n').filter(line => line.trim().length > 0),
      equipmentNeeded: newTestEquipment.split(',').map(eq => eq.trim()).filter(Boolean),
      unit: newTestUnit,
      unitLabel: newTestUnitLabel,
      direction: newTestDirection,
      isBuiltIn: false,
      isCustom: true,
      hasBilateral: false,
      hasArmSupportOption: true
    };

    await saveFunctionalTest(customTest);
    setIsCustomTestModalOpen(false);
    // Reset form
    setNewTestName('');
    setNewTestShortName('');
    setNewTestInstructions('');
    setNewTestEquipment('');
  };

  return (
    <div className="space-y-6">
      
      {/* Batteries Banner (Quick Battery Start) */}
      <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] bg-[#F3F4F6] px-2 py-0.5 rounded-full border border-[#E5E7EB]">
                Baterias Padronizadas
              </span>
              <span className="text-xs text-[#4B5563]">
                Protocolos Sequenciais Validados
              </span>
            </div>
            <h3 className="text-lg font-black font-display text-white">
              Aplicar Bateria Completa de Testes
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {functionalBatteries.map((battery) => (
            <div
              key={battery.id}
              className="bg-[#121212] border border-[#27272A] hover:border-[#374151] rounded-2xl p-4 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#27272A] text-[#4B5563] uppercase">
                    ~{battery.estimatedDurationMinutes} min
                  </span>
                  <span className="text-[11px] font-black font-mono-nums text-[#374151]">
                    {battery.testIds.length} Testes
                  </span>
                </div>
                <h4 className="text-sm font-black font-display text-white group-hover:text-[#1F2937] transition-colors">
                  {battery.title}
                </h4>
                <p className="text-xs text-[#4B5563] mt-1 line-clamp-2 leading-relaxed">
                  {battery.description}
                </p>
              </div>

              <button
                onClick={() => onSelectBatteryToRun(battery)}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-[#27272A] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Iniciar Bateria</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tests Library Header & Controls */}
      <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 sm:p-6 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black font-display text-white">
              Biblioteca de Testes Funcionais
            </h3>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Explore os protocolos por domínio e aplique testes individualmente.
            </p>
          </div>

          <button
            onClick={() => setIsCustomTestModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Teste Personalizado</span>
          </button>
        </div>

        {/* Search & Domain Filters */}
        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, objetivo ou categoria..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#374151]"
            />
          </div>

          {/* Domain Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'strength', label: 'Força' },
              { id: 'mobility', label: 'Mobilidade' },
              { id: 'balance', label: 'Equilíbrio' },
              { id: 'locomotion', label: 'Locomoção' },
              { id: 'endurance', label: 'Resistência' },
              { id: 'autonomy', label: 'Autonomia' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedDomain(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedDomain === tab.id
                    ? 'bg-[#374151] text-white shadow-md shadow-xs'
                    : 'bg-[#121212] text-[#4B5563] hover:text-white border border-[#27272A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Tests Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            className="bg-[#18181B] border border-[#27272a] hover:border-[#3F3F46] rounded-3xl p-5 flex flex-col justify-between transition-all"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#27272A] text-[#4B5563]">
                  {test.category}
                </span>
                <span className="text-[11px] font-bold text-[#4B5563] uppercase">
                  Unidade: <strong className="text-white">{test.unitLabel}</strong>
                </span>
              </div>

              <h4 className="text-lg font-black font-display text-white">
                {test.name}
              </h4>
              <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                {test.description}
              </p>

              {/* Protocol Highlights */}
              <div className="mt-3.5 space-y-2">
                {test.equipmentNeeded && test.equipmentNeeded.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
                    <span className="font-bold text-zinc-600">Equipamentos:</span>
                    <span>{test.equipmentNeeded.join(', ')}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
                  <span className="font-bold text-zinc-600">Melhoria:</span>
                  <span className="text-emerald-400">
                    {test.direction === 'higher_is_better' ? 'Maior valor / repetições' : test.direction === 'lower_is_better' ? 'Menor tempo em segundos' : 'Níveis mais independentes'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Action */}
            <div className="mt-5 pt-4 border-t border-[#27272A] flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                {test.isCustom ? 'Personalizado' : 'Protocolo Oficial'}
              </span>

              <button
                onClick={() => onSelectTestToRun(test)}
                className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Aplicar Teste</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Test Creation Modal */}
      {isCustomTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272a] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-base font-black font-display text-white">
                Cadastrar Teste Personalizado
              </h3>
              <button
                onClick={() => setIsCustomTestModalOpen(false)}
                className="text-[#4B5563] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomTest} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">Nome do Teste *</label>
                <input
                  type="text"
                  required
                  value={newTestName}
                  onChange={e => setNewTestName(e.target.value)}
                  placeholder="Ex: Sentar e Levantar em Banco Baixo (35cm)"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">Domínio</label>
                  <select
                    value={newTestDomain}
                    onChange={e => setNewTestDomain(e.target.value as FunctionalDomain)}
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                  >
                    <option value="strength">Força Funcional</option>
                    <option value="mobility">Mobilidade</option>
                    <option value="balance">Equilíbrio</option>
                    <option value="locomotion">Locomoção</option>
                    <option value="endurance">Resistência</option>
                    <option value="autonomy">Autonomia Diária</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">Unidade de Medida</label>
                  <select
                    value={newTestUnit}
                    onChange={e => {
                      const u = e.target.value as any;
                      setNewTestUnit(u);
                      if (u === 'reps') setNewTestUnitLabel('repetições');
                      if (u === 'seconds') setNewTestUnitLabel('segundos');
                      if (u === 'kg') setNewTestUnitLabel('kg');
                      if (u === 'meters') setNewTestUnitLabel('metros');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none"
                  >
                    <option value="reps">Repetições (reps)</option>
                    <option value="seconds">Tempo em Segundos (s)</option>
                    <option value="kg">Carga em Kg</option>
                    <option value="meters">Distância em Metros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">Direção de Melhoria</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTestDirection('higher_is_better')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newTestDirection === 'higher_is_better'
                        ? 'bg-[#374151] text-white border-[#374151]'
                        : 'bg-[#121212] text-[#4B5563] border-[#27272A]'
                    }`}
                  >
                    Maior Valor é Melhor
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTestDirection('lower_is_better')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newTestDirection === 'lower_is_better'
                        ? 'bg-[#374151] text-white border-[#374151]'
                        : 'bg-[#121212] text-[#4B5563] border-[#27272A]'
                    }`}
                  >
                    Menor Tempo é Melhor
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">Instruções de Execução (1 por linha)</label>
                <textarea
                  rows={3}
                  value={newTestInstructions}
                  onChange={e => setNewTestInstructions(e.target.value)}
                  placeholder="1. Posicionar aluno confortavelmente...&#10;2. Iniciar cronômetro ao comando...&#10;3. Registrar término ao cruzar a linha."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">Equipamentos Necessários (separados por vírgula)</label>
                <input
                  type="text"
                  value={newTestEquipment}
                  onChange={e => setNewTestEquipment(e.target.value)}
                  placeholder="Banco, cronômetro, fita métrica"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                />
              </div>

              <div className="pt-3 border-t border-[#27272a] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomTestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#27272A] text-[#4B5563] text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider"
                >
                  Salvar Teste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
