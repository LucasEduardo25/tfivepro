import React, { useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { StudentPhotoPicker } from './StudentPhotoPicker';

interface StudentEditModalProps {
  student: Student;
  onClose: () => void;
  onSaved?: (updatedStudent: Student) => void;
}

export const StudentEditModal: React.FC<StudentEditModalProps> = ({
  student,
  onClose,
  onSaved
}) => {
  const { saveStudent } = useApp();

  const [formData, setFormData] = useState<Student>({ ...student });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('O nome do aluno é obrigatório.');
      return;
    }

    const updated: Student = {
      ...formData,
      name: formData.name.trim(),
      photo: formData.photo?.trim() || '',
      phone: formData.phone?.trim() || '',
      email: formData.email?.trim() || '',
      goal: formData.goal?.trim() || '',
      notes: formData.notes?.trim() || '',
      planName: formData.planName?.trim() || '',
      priceMonthly: Number(formData.priceMonthly) || 0,
      updatedAt: new Date().toISOString()
    };

    await saveStudent(updated);
    if (onSaved) onSaved(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#27272a] rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#374151]" />
            <h2 className="text-xl font-bold font-display uppercase text-white">
              Editar Dados do Aluno
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#18181B] text-[#4B5563] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Photo Picker */}
          <StudentPhotoPicker
            photoUrl={formData.photo}
            studentName={formData.name}
            onPhotoChange={(newPhoto) => setFormData(prev => ({ ...prev, photo: newPhoto }))}
            onPhotoRemove={() => setFormData(prev => ({ ...prev, photo: '' }))}
          />

          {/* Name */}
          <div>
            <label className="block text-white font-bold mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white font-bold mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 98888-7777"
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-1">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="aluno@email.com"
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
              />
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="block text-white font-bold mb-1">Objetivo Principal</label>
            <input
              type="text"
              value={formData.goal}
              onChange={e => setFormData({ ...formData, goal: e.target.value })}
              placeholder="Ex: Hipertrofia e Ganho de Força"
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
            />
          </div>

          {/* Gender & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white font-bold mb-1">Gênero</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-bold mb-1">Status do Aluno</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          {/* Plan & Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white font-bold mb-1">Modalidade</label>
              <select
                value={formData.modality || 'IN_PERSON'}
                onChange={e => setFormData({ ...formData, modality: e.target.value as 'IN_PERSON' | 'ONLINE_COACHING' })}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
              >
                <option value="IN_PERSON">Presencial</option>
                <option value="ONLINE_COACHING">Consultoria Online</option>
              </select>
            </div>
            <div>
              <label className="block text-white font-bold mb-1">Nome do Plano</label>
              <input
                type="text"
                value={formData.planName || ''}
                onChange={e => setFormData({ ...formData, planName: e.target.value })}
                placeholder="Ex: Consultoria Premium"
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-1">Valor Mensal (R$)</label>
              <input
                type="number"
                value={formData.priceMonthly || ''}
                onChange={e => setFormData({ ...formData, priceMonthly: parseFloat(e.target.value) || 0 })}
                placeholder="800"
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-white font-bold mb-1">Observações Gerais / Restrições</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Histórico médico, lesões, preferências de horário..."
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151] resize-none"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-red-400 p-2.5 bg-red-950/40 rounded-xl border border-red-800">
              {errorMessage}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#18181B] border border-[#27272A] text-white font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold shadow-md shadow-xs"
            >
              Salvar Alterações
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
