import React, { useState } from 'react';
import { X, UserPlus, Check, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../db/indexedDB';
import { StudentPhotoPicker } from './StudentPhotoPicker';

interface NewStudentModalProps {
  onClose: () => void;
  onStudentCreated?: (student: Student, initialTab?: string) => void;
}

export const NewStudentModal: React.FC<NewStudentModalProps> = ({
  onClose,
  onStudentCreated
}) => {
  const { saveStudent } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState('Hipertrofia e Ganho de Força');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [modality, setModality] = useState<'IN_PERSON' | 'ONLINE_COACHING'>('IN_PERSON');
  const [photo, setPhoto] = useState('');
  const [planName, setPlanName] = useState('Plano Personal Presencial');
  const [priceMonthly, setPriceMonthly] = useState<number>(800);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const newStudent: Student = {
      id: generateId('student'),
      name: name.trim(),
      photo: photo.trim(),
      phone: phone.trim(),
      email: email.trim(),
      goal: goal.trim(),
      notes: notes.trim(),
      status: 'active',
      gender,
      modality,
      planName: planName.trim(),
      priceMonthly: Number(priceMonthly) || 0,
      startDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveStudent(newStudent);
      setCreatedStudent(newStudent);
    } catch (err) {
      console.error('Erro ao salvar novo aluno:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToProfile = () => {
    if (createdStudent && onStudentCreated) {
      onStudentCreated(createdStudent, 'summary');
    }
    onClose();
  };

  // SUCCESS SCREEN: ALUNO CADASTRADO ✓ -> [ IR PARA PERFIL ]
  if (createdStudent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white border border-[#D4D4D4] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 mx-auto animate-in zoom-in duration-300">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 text-xs font-black font-display uppercase tracking-wider inline-block">
              Aluno Cadastrado ✓
            </span>
            <h2 className="text-xl font-black font-display text-[#18181B] tracking-tight">
              {createdStudent.name}
            </h2>
            <p className="text-xs text-[#525252] max-w-xs mx-auto">
              O aluno foi registrado com sucesso. Você já pode prescrever treinos, registrar avaliações e acompanhar a evolução.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleGoToProfile}
              className="w-full py-3.5 px-4 rounded-xl bg-[#27272A] hover:bg-[#18181B] text-white font-black font-display text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Acessar Perfil do Aluno</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl text-[#525252] hover:text-[#18181B] hover:bg-[#F1F1F1] text-xs font-bold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-display text-white tracking-tight">Cadastrar Novo Aluno</h2>
              <p className="text-xs text-[#4B5563]">Adicione um aluno para começar os treinos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#27272a]/60 hover:bg-[#27272a] text-[#4B5563] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Photo Picker */}
          <StudentPhotoPicker
            photoUrl={photo}
            studentName={name || 'Aluno'}
            onPhotoChange={setPhoto}
            onPhotoRemove={() => setPhoto('')}
          />

          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Carlos Santana"
              className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none transition-colors"
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
                WhatsApp / Celular
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
                E-mail (Opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="aluno@email.com"
                className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
              Gênero
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  gender === 'male'
                    ? 'bg-[#374151] border-[#374151] text-white'
                    : 'bg-[#050505] border-[#27272a] text-[#4B5563] hover:text-white'
                }`}
              >
                Masculino
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  gender === 'female'
                    ? 'bg-[#374151] border-[#374151] text-white'
                    : 'bg-[#050505] border-[#27272a] text-[#4B5563] hover:text-white'
                }`}
              >
                Feminino
              </button>
            </div>
          </div>

          {/* Main Goal */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
              Objetivo Principal
            </label>
            <select
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="Hipertrofia e Ganho de Força">Hipertrofia e Ganho de Força</option>
              <option value="Emagrecimento e Definição">Emagrecimento e Definição</option>
              <option value="Condicionamento e Saúde">Condicionamento e Saúde</option>
              <option value="Reabilitação e Postura">Reabilitação e Postura</option>
              <option value="Performance Esportiva">Performance Esportiva</option>
            </select>
          </div>

          {/* Plan & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
                Modalidade
              </label>
              <select
                value={modality}
                onChange={e => setModality(e.target.value as 'IN_PERSON' | 'ONLINE_COACHING')}
                className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none appearance-none"
              >
                <option value="IN_PERSON">Presencial</option>
                <option value="ONLINE_COACHING">Consultoria Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
                Plano / Formato
              </label>
              <input
                type="text"
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                placeholder="Presencial 3x/sem"
                className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
                Mensalidade (R$)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={priceMonthly}
                onChange={e => setPriceMonthly(Number(e.target.value))}
                className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
              Observações / Restrições (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Histórico de lesões, restrições articulares..."
              className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2 text-sm text-white placeholder-[#71717A] focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white hover:bg-[#27272a]/40 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-xs font-bold text-white transition-all shadow-[0_4px_15px_rgba(217,4,41,0.3)] flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Aluno</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
