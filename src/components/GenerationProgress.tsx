import React, { useEffect, useState } from 'react';

interface GenerationProgressProps {
  withImages: boolean;
}

// A geração com IA leva de 20 a 60 segundos. Mostrar as etapas evita a impressão de que travou.
const STEPS_WITH_IMAGES = [
  { from: 0, label: 'Lendo o perfil pedagógico e o PAEE' },
  { from: 4, label: 'Escrevendo os exercícios adaptados' },
  { from: 18, label: 'Desenhando as ilustrações didáticas' },
  { from: 45, label: 'Montando a folha A4' },
];

const STEPS_TEXT_ONLY = [
  { from: 0, label: 'Lendo o perfil pedagógico e o PAEE' },
  { from: 4, label: 'Escrevendo os exercícios adaptados' },
  { from: 15, label: 'Montando a folha A4' },
];

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ withImages }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const steps = withImages ? STEPS_WITH_IMAGES : STEPS_TEXT_ONLY;
  const current = steps.reduce((idx, step, i) => (elapsed >= step.from ? i : idx), 0);
  const expected = withImages ? 'até 1 minuto' : 'cerca de 20 segundos';

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full mt-3 p-4 rounded-xl border border-[#2B7DE9]/30 bg-[#F2F7FF] no-print"
    >
      <ol className="space-y-1.5">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={step.label}
              className={`flex items-center gap-2 text-sm ${
                active ? 'font-semibold text-[#0B1E3B]' : done ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[11px] ${
                  done ? 'bg-[#2B7DE9] text-white' : active ? 'border-2 border-[#2B7DE9] animate-pulse' : 'border border-slate-300'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              {step.label}
              {active ? '…' : ''}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-slate-600">
        {elapsed}s · costuma levar {expected}. A IA sugere; a revisão é sempre do professor.
      </p>
    </div>
  );
};
