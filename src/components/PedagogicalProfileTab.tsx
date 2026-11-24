import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { apiJson } from '../api';
import type { Student } from '../types';

interface PedagogicalProfileTabProps {
  student: Student;
  isDemo: boolean;
  onUpdated: (student: Student) => void;
}

export const PedagogicalProfileTab: React.FC<PedagogicalProfileTabProps> = ({
  student,
  isDemo,
  onUpdated,
}) => {
  const [form, setForm] = useState<Student>(student);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(student);
    setSavedNotice('');
    setError('');
  }, [student]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      onUpdated(form);
      setSavedNotice('Alteração aplicada somente nesta sessão de demonstração.');
      return;
    }
    setSaving(true);
    setError('');
    setSavedNotice('');
    try {
      const res = await apiJson<{ student: Student }>(`/api/students/${student.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      onUpdated(res.student);
      setSavedNotice('Perfil pedagógico salvo com sucesso.');
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar perfil pedagógico.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof Student, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B1E3B]">Perfil pedagógico do estudante</h2>
          <p className="text-sm text-slate-600">
            Cadastro parcial aceito. Não exige diagnóstico clínico ou laudo médico.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}
      {savedNotice && (
        <div role="status" className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-sm">
          {savedNotice}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1">
            Nome de uso
          </label>
          <input
            id="prof-name"
            type="text"
            value={form.displayName}
            onChange={(e) => setField('displayName', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label htmlFor="prof-code" className="block text-xs font-semibold text-slate-700 mb-1">
            Iniciais ou código institucional
          </label>
          <input
            id="prof-code"
            type="text"
            value={form.codeOrInitials}
            onChange={(e) => setField('codeOrInitials', e.target.value)}
            placeholder="Ex.: LM-4B"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div>
          <label htmlFor="prof-school" className="block text-xs font-semibold text-slate-700 mb-1">
            Escola
          </label>
          <input
            id="prof-school"
            type="text"
            value={form.schoolName}
            onChange={(e) => setField('schoolName', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label htmlFor="prof-year" className="block text-xs font-semibold text-slate-700 mb-1">
            Ano letivo
          </label>
          <input
            id="prof-year"
            type="text"
            value={form.schoolYear}
            onChange={(e) => setField('schoolYear', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="prof-grade" className="block text-xs font-semibold text-slate-700 mb-1">
            Ano / Série
          </label>
          <input
            id="prof-grade"
            type="text"
            value={form.gradeLevel}
            onChange={(e) => setField('gradeLevel', e.target.value)}
            placeholder="Ex.: 4º Ano EF"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label htmlFor="prof-class" className="block text-xs font-semibold text-slate-700 mb-1">
            Turma
          </label>
          <input
            id="prof-class"
            type="text"
            value={form.classroom}
            onChange={(e) => setField('classroom', e.target.value)}
            placeholder="Ex.: Turma B"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          ['strengths', 'Potencialidades'],
          ['interests', 'Interesses'],
          ['learningLevel', 'Nível atual de aprendizagem'],
          ['communicationModes', 'Formas de comunicação e resposta'],
          ['barriers', 'Barreiras identificadas'],
          ['workingStrategies', 'Estratégias que funcionam'],
          ['accessibilityResources', 'Recursos de acessibilidade'],
          ['latestPedagogicalEval', 'Avaliação pedagógica mais recente'],
        ].map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`prof-${key}`} className="block text-xs font-semibold text-slate-700 mb-1">
              {label}
            </label>
            <textarea
              id={`prof-${key}`}
              rows={3}
              value={String(form[key as keyof Student] || '')}
              onChange={(e) => setField(key as keyof Student, e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm leading-relaxed"
            />
          </div>
        ))}
      </div>
    </form>
  );
};
