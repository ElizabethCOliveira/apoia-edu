import React, { useState } from 'react';
import { X } from 'lucide-react';
import { apiJson } from '../api';
import type { ApplicationFeedback, PedagogicalActivity, Student } from '../types';

interface FeedbackModalProps {
  student: Student;
  activity: PedagogicalActivity;
  teacherName: string;
  isDemo: boolean;
  onClose: () => void;
  onSaved: (app: ApplicationFeedback) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  student,
  activity,
  teacherName,
  isDemo,
  onClose,
  onSaved,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const [appliedDate, setAppliedDate] = useState(today);
  const [status, setStatus] = useState<'aplicada' | 'nao_aplicada'>('aplicada');
  const [participation, setParticipation] = useState<'participou' | 'participou_em_parte' | 'nao_foi_possivel_observar'>('participou');
  const [objectiveStatus, setObjectiveStatus] = useState<'alcancado' | 'parcialmente_alcancado' | 'ainda_nao_alcancado' | 'nao_foi_possivel_observar'>('parcialmente_alcancado');
  const [supportLevel, setSupportLevel] = useState<'autonomia' | 'apoio_pontual' | 'apoio_frequente'>('apoio_pontual');
  const [helpfulResource, setHelpfulResource] = useState('');
  const [briefObservation, setBriefObservation] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const endpoint = isDemo
        ? `/api/demo/activities/${activity.id}/applications`
        : `/api/activities/${activity.id}/applications`;
      const res = await apiJson<{ application: ApplicationFeedback }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          objectiveText: activity.peiObjectiveText || activity.content.adaptedObjective || activity.title,
          appliedDate,
          status,
          participation: status === 'nao_aplicada' ? '' : participation,
          objectiveStatus: status === 'nao_aplicada' ? '' : objectiveStatus,
          supportLevel: status === 'nao_aplicada' ? '' : supportLevel,
          helpfulResource: status === 'nao_aplicada' ? '' : helpfulResource,
          briefObservation,
          nextStep,
        }),
      });
      onSaved(res.application);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar feedback da aplicação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#071429]/60 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h2 id="feedback-modal-title" className="font-display text-lg font-bold text-[#0B1E3B]">
              Registrar como foi a aplicação
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Estudante: <strong>{student.displayName}</strong> · Professor(a): <strong>{teacherName}</strong> · Versão{' '}
              <span className="font-mono">v{activity.versionNumber}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar janela" className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-[#F6F8FB] border border-slate-200 text-xs text-slate-700">
          <p>
            <strong>Atividade:</strong> {activity.title}
          </p>
          <p className="mt-1">
            <strong>Objetivo:</strong> {activity.peiObjectiveText || activity.content.adaptedObjective}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-lg border border-red-300 bg-red-50 text-sm text-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fb-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Data da aplicação (sugerida hoje, editável)
              </label>
              <input
                id="fb-date"
                type="date"
                required
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="fb-status" className="block text-xs font-semibold text-slate-700 mb-1">
                Situação
              </label>
              <select
                id="fb-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'aplicada' | 'nao_aplicada')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="aplicada">Aplicada</option>
                <option value="nao_aplicada">Não aplicada</option>
              </select>
            </div>
          </div>

          {status === 'aplicada' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="fb-part" className="block text-xs font-semibold text-slate-700 mb-1">
                    Participação
                  </label>
                  <select
                    id="fb-part"
                    value={participation}
                    onChange={(e) => setParticipation(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="participou">Participou</option>
                    <option value="participou_em_parte">Participou em parte</option>
                    <option value="nao_foi_possivel_observar">Não foi possível observar</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fb-obj" className="block text-xs font-semibold text-slate-700 mb-1">
                    Objetivo
                  </label>
                  <select
                    id="fb-obj"
                    value={objectiveStatus}
                    onChange={(e) => setObjectiveStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="alcancado">Alcançado</option>
                    <option value="parcialmente_alcancado">Parcialmente alcançado</option>
                    <option value="ainda_nao_alcancado">Ainda não alcançado</option>
                    <option value="nao_foi_possivel_observar">Não foi possível observar</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fb-sup" className="block text-xs font-semibold text-slate-700 mb-1">
                    Apoio utilizado
                  </label>
                  <select
                    id="fb-sup"
                    value={supportLevel}
                    onChange={(e) => setSupportLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="autonomia">Autonomia</option>
                    <option value="apoio_pontual">Apoio pontual</option>
                    <option value="apoio_frequente">Apoio frequente</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="fb-res" className="block text-xs font-semibold text-slate-700 mb-1">
                  Recurso que ajudou (opcional)
                </label>
                <input
                  id="fb-res"
                  type="text"
                  value={helpfulResource}
                  onChange={(e) => setHelpfulResource(e.target.value)}
                  placeholder="Ex.: Roteiro visual na carteira, material dourado..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="fb-obs" className="block text-xs font-semibold text-slate-700 mb-1">
              Observação breve (opcional)
            </label>
            <textarea
              id="fb-obs"
              rows={2}
              value={briefObservation}
              onChange={(e) => setBriefObservation(e.target.value)}
              placeholder="Descreva o que foi observado nesta aplicação..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label htmlFor="fb-next" className="block text-xs font-semibold text-slate-700 mb-1">
              Próximo passo (opcional)
            </label>
            <input
              id="fb-next"
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="Ex.: Reduzir dicas visuais na próxima etapa..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
