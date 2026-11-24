import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, ClipboardCheck, Filter, LineChart, RotateCcw } from 'lucide-react';
import type { ApplicationFeedback, PedagogicalActivity, Student } from '../types';

interface DevelopmentTabProps {
  student: Student;
  activities: PedagogicalActivity[];
  applications: ApplicationFeedback[];
  onOpenFeedbackModal: (activity: PedagogicalActivity) => void;
}

const SUPPORT_LABELS: Record<string, string> = {
  autonomia: 'Autonomia',
  apoio_pontual: 'Apoio pontual',
  apoio_frequente: 'Apoio frequente',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  alcancado: 'Alcançado',
  parcialmente_alcancado: 'Parcialmente alcançado',
  ainda_nao_alcancado: 'Ainda não alcançado',
  nao_foi_possivel_observar: 'Não foi possível observar',
};

const PARTICIPATION_LABELS: Record<string, string> = {
  participou: 'Participou',
  participou_em_parte: 'Participou em parte',
  nao_foi_possivel_observar: 'Não foi possível observar',
};

const BIMESTER_ORDER: Record<string, number> = {
  '1º Bimestre': 1,
  '2º Bimestre': 2,
  '3º Bimestre': 3,
  '4º Bimestre': 4,
};

function objectiveToLevel(status: ApplicationFeedback['objectiveStatus']): number | null {
  if (status === 'alcancado') return 3;
  if (status === 'parcialmente_alcancado') return 2;
  if (status === 'ainda_nao_alcancado') return 1;
  return null;
}

function supportToLevel(level: ApplicationFeedback['supportLevel']): number {
  if (level === 'autonomia') return 3;
  if (level === 'apoio_pontual') return 2;
  return 1;
}

function levelToObjectiveLabel(level: number): string {
  if (level >= 2.5) return 'Alcançado';
  if (level >= 1.5) return 'Parcialmente alcançado';
  return 'Ainda não alcançado';
}

function levelToSupportLabel(level: number): string {
  if (level >= 2.5) return 'Autonomia';
  if (level >= 1.5) return 'Apoio pontual';
  return 'Apoio frequente';
}

function formatShortDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function formatFullDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function predominantSupport(items: ApplicationFeedback[]): string {
  if (items.length === 0) return '—';
  const counts: Record<string, number> = {};
  for (const ap of items) {
    counts[ap.supportLevel] = (counts[ap.supportLevel] || 0) + 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (best && SUPPORT_LABELS[best]) || '—';
}

interface TrajectoryPoint {
  id: string;
  xLabel: string;
  subLabel: string;
  objLevel: number;
  supLevel: number;
  count: number;
  singleApp?: ApplicationFeedback;
  periodApps?: ApplicationFeedback[];
}

export const DevelopmentTab: React.FC<DevelopmentTabProps> = ({
  student,
  activities,
  applications,
  onOpenFeedbackModal,
}) => {
  const [filterYear, setFilterYear] = useState('todos');
  const [filterBimester, setFilterBimester] = useState('todos');
  const [filterSubject, setFilterSubject] = useState('todos');
  const [filterObjective, setFilterObjective] = useState('todos');
  const [chartView, setChartView] = useState<'evolucao' | 'componente'>('evolucao');
  const [trajectoryGrouping, setTrajectoryGrouping] = useState<'aplicacao' | 'bimestre'>('aplicacao');
  const [activePointId, setActivePointId] = useState<string | null>(null);

  // Reset filters smoothly when switching students
  useEffect(() => {
    setFilterYear('todos');
    setFilterBimester('todos');
    setFilterSubject('todos');
    setFilterObjective('todos');
    setActivePointId(null);
  }, [student.id]);

  // Union of years, bimesters and subjects from BOTH activities and applications
  const years = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => a.schoolYear && set.add(a.schoolYear));
    applications.forEach((ap) => ap.schoolYear && set.add(ap.schoolYear));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [activities, applications]);

  const bimesters = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => a.bimester && set.add(a.bimester));
    applications.forEach((ap) => ap.bimester && set.add(ap.bimester));
    return Array.from(set).sort((a, b) => (BIMESTER_ORDER[a] ?? 99) - (BIMESTER_ORDER[b] ?? 99) || a.localeCompare(b));
  }, [activities, applications]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => a.subject && set.add(a.subject));
    applications.forEach((ap) => ap.subject && set.add(ap.subject));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [activities, applications]);

  const objectives = useMemo(
    () => Array.from(new Set(applications.map((ap) => ap.objectiveText).filter(Boolean))),
    [applications]
  );

  const hasActiveFilters =
    filterYear !== 'todos' || filterBimester !== 'todos' || filterSubject !== 'todos' || filterObjective !== 'todos';

  const resetFilters = () => {
    setFilterYear('todos');
    setFilterBimester('todos');
    setFilterSubject('todos');
    setFilterObjective('todos');
    setActivePointId(null);
  };

  // Applications filtered by Ano, Bimestre, Componente and Objetivo
  const filteredApplications = useMemo(() => {
    return applications.filter((ap) => {
      if (filterYear !== 'todos' && ap.schoolYear !== filterYear) return false;
      if (filterBimester !== 'todos' && ap.bimester !== filterBimester) return false;
      if (filterSubject !== 'todos' && ap.subject !== filterSubject) return false;
      if (filterObjective !== 'todos' && ap.objectiveText !== filterObjective) return false;
      return true;
    });
  }, [applications, filterYear, filterBimester, filterSubject, filterObjective]);

  // Applied records sorted chronologically for chart plotting
  const appliedChronological = useMemo(() => {
    return filteredApplications
      .filter((ap) => ap.status === 'aplicada')
      .slice()
      .sort((a, b) => a.appliedDate.localeCompare(b.appliedDate));
  }, [filteredApplications]);

  // Subject breakdown respects Ano, Bimestre and Objetivo so schools can compare all curricular components side by side
  const subjectBreakdown = useMemo(() => {
    const base = applications.filter((ap) => {
      if (ap.status !== 'aplicada') return false;
      if (filterYear !== 'todos' && ap.schoolYear !== filterYear) return false;
      if (filterBimester !== 'todos' && ap.bimester !== filterBimester) return false;
      if (filterObjective !== 'todos' && ap.objectiveText !== filterObjective) return false;
      return true;
    });

    const grouped = new Map<string, ApplicationFeedback[]>();
    for (const ap of base) {
      const subj = ap.subject || 'Outro componente';
      const arr = grouped.get(subj) || [];
      arr.push(ap);
      grouped.set(subj, arr);
    }

    return Array.from(grouped.entries())
      .map(([subjectName, entries]) => {
        const sorted = entries.slice().sort((a, b) => a.appliedDate.localeCompare(b.appliedDate));
        const alcancado = entries.filter((e) => e.objectiveStatus === 'alcancado').length;
        const parcial = entries.filter((e) => e.objectiveStatus === 'parcialmente_alcancado').length;
        const aindaNao = entries.filter((e) => e.objectiveStatus === 'ainda_nao_alcancado').length;
        const naoObs = entries.filter((e) => e.objectiveStatus === 'nao_foi_possivel_observar').length;
        const latest = sorted[sorted.length - 1];
        return {
          subject: subjectName,
          total: entries.length,
          alcancado,
          parcial,
          aindaNao,
          naoObs,
          predominantSupport: predominantSupport(entries),
          latestDate: latest?.appliedDate || '',
          latestStatus: latest ? OBJECTIVE_LABELS[latest.objectiveStatus] || latest.objectiveStatus : '—',
        };
      })
      .sort((a, b) => b.total - a.total || a.subject.localeCompare(b.subject, 'pt-BR'));
  }, [applications, filterYear, filterBimester, filterObjective]);

  // Build trajectory points for the interactive SVG line chart
  const trajectoryPoints: TrajectoryPoint[] = useMemo(() => {
    if (trajectoryGrouping === 'aplicacao') {
      return appliedChronological
        .filter((ap) => objectiveToLevel(ap.objectiveStatus) !== null)
        .map((ap) => {
          const bimLabel = (ap.bimester || 'Sem bimestre').replace(' Bimestre', ' Bim');
          const subjLabel = ap.subject || 'Componente';
          return {
            id: ap.id,
            xLabel: formatShortDate(ap.appliedDate),
            subLabel: `${bimLabel} · ${subjLabel}`,
            objLevel: objectiveToLevel(ap.objectiveStatus) as number,
            supLevel: supportToLevel(ap.supportLevel),
            count: 1,
            singleApp: ap,
          };
        });
    }

    // Group by Ano + Bimestre in chronological order
    const buckets = new Map<string, { year: string; bimester: string; apps: ApplicationFeedback[] }>();
    for (const ap of appliedChronological) {
      const year = ap.schoolYear || '2026';
      const bimester = ap.bimester || '1º Bimestre';
      const key = `${year}__${bimester}`;
      const existing: { year: string; bimester: string; apps: ApplicationFeedback[] } = buckets.get(key) || {
        year,
        bimester,
        apps: [],
      };
      existing.apps.push(ap);
      buckets.set(key, existing);
    }

    return Array.from(buckets.entries())
      .sort((a, b) => {
        const yCmp = a[1].year.localeCompare(b[1].year);
        if (yCmp !== 0) return yCmp;
        return (BIMESTER_ORDER[a[1].bimester] ?? 99) - (BIMESTER_ORDER[b[1].bimester] ?? 99);
      })
      .map(([key, bucket]) => {
        const validObj = bucket.apps
          .map((ap) => objectiveToLevel(ap.objectiveStatus))
          .filter((v): v is number => v !== null);
        const avgObj = validObj.length > 0 ? validObj.reduce((s, n) => s + n, 0) / validObj.length : 1;
        const avgSup = bucket.apps.reduce((s, ap) => s + supportToLevel(ap.supportLevel), 0) / bucket.apps.length;
        return {
          id: key,
          xLabel: `${bucket.bimester.replace(' Bimestre', ' Bim')}/${bucket.year.slice(-2)}`,
          subLabel: `${bucket.apps.length} ${bucket.apps.length === 1 ? 'aplicação' : 'aplicações'}`,
          objLevel: Number(avgObj.toFixed(2)),
          supLevel: Number(avgSup.toFixed(2)),
          count: bucket.apps.length,
          periodApps: bucket.apps,
        };
      });
  }, [appliedChronological, trajectoryGrouping]);

  const selectedPoint = useMemo(() => {
    if (trajectoryPoints.length === 0) return null;
    if (activePointId) {
      const found = trajectoryPoints.find((p) => p.id === activePointId);
      if (found) return found;
    }
    return trajectoryPoints[trajectoryPoints.length - 1];
  }, [trajectoryPoints, activePointId]);

  // Summary KPIs for the current filter slice
  const kpis = useMemo(() => {
    const applied = appliedChronological;
    const alcancado = applied.filter((ap) => ap.objectiveStatus === 'alcancado').length;
    const parcial = applied.filter((ap) => ap.objectiveStatus === 'parcialmente_alcancado').length;
    const pctAlcancado = applied.length > 0 ? Math.round((alcancado / applied.length) * 100) : 0;
    return {
      totalApplied: applied.length,
      alcancado,
      parcial,
      pctAlcancado,
      predominant: predominantSupport(applied),
    };
  }, [appliedChronological]);

  // Synchronized activities table filter
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (filterYear !== 'todos' && act.schoolYear !== filterYear) return false;
      if (filterBimester !== 'todos' && act.bimester !== filterBimester) return false;
      if (filterSubject !== 'todos' && act.subject !== filterSubject) return false;
      return true;
    });
  }, [activities, filterYear, filterBimester, filterSubject]);

  // Group applications by objective to allow comparing multiple applications considering supports used
  const objectiveGroups = useMemo(() => {
    const map = new Map<string, ApplicationFeedback[]>();
    for (const ap of filteredApplications) {
      const key = ap.objectiveText || ap.activityTitle || 'Objetivo geral';
      const arr = map.get(key) || [];
      arr.push(ap);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filteredApplications]);

  // SVG Chart Geometry
  const svgW = 760;
  const svgH = 264;
  const padL = 166;
  const padR = 34;
  const padT = 28;
  const padB = 56;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const yForLevel = (level: number) => {
    const clamped = Math.max(1, Math.min(3, level));
    return padT + ((3 - clamped) / 2) * plotH;
  };

  const xForIndex = (index: number, total: number) => {
    if (total <= 1) return padL + plotW / 2;
    return padL + (index / (total - 1)) * plotW;
  };

  const objectiveLinePoints = trajectoryPoints
    .map((pt, idx) => `${xForIndex(idx, trajectoryPoints.length)},${yForLevel(pt.objLevel)}`)
    .join(' ');

  const supportLinePoints = trajectoryPoints
    .map((pt, idx) => `${xForIndex(idx, trajectoryPoints.length)},${yForLevel(pt.supLevel)}`)
    .join(' ');

  const pointDotColor = (objLevel: number) => {
    if (objLevel >= 2.5) return '#10B981';
    if (objLevel >= 1.5) return '#2B7DE9';
    return '#DC2626';
  };

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1E3B]">
              Desenvolvimento ao longo do ano · {student.displayName}
            </h2>
            <p className="text-sm text-slate-600">
              Acompanhamento visual e pedagógico por bimestre, ano letivo e componente curricular, considerando os apoios utilizados.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
            {activities.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenFeedbackModal(activities[0])}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1E3B] text-white text-sm font-semibold hover:bg-[#132D54] cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-[#FACC15]" />
                Registrar como foi
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div>
            <label htmlFor="dev-filter-year" className="block text-xs font-semibold text-slate-600 mb-1">
              Ano letivo
            </label>
            <select
              id="dev-filter-year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-[#0B1E3B]"
            >
              <option value="todos">Todos os anos</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dev-filter-bimester" className="block text-xs font-semibold text-slate-600 mb-1">
              Bimestre
            </label>
            <select
              id="dev-filter-bimester"
              value={filterBimester}
              onChange={(e) => setFilterBimester(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-[#0B1E3B]"
            >
              <option value="todos">Todos os bimestres</option>
              {bimesters.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dev-filter-subject" className="block text-xs font-semibold text-slate-600 mb-1">
              Componente curricular
            </label>
            <select
              id="dev-filter-subject"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-[#0B1E3B]"
            >
              <option value="todos">Todos os componentes</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dev-filter-objective" className="block text-xs font-semibold text-slate-600 mb-1">
              Objetivo
            </label>
            <select
              id="dev-filter-objective"
              value={filterObjective}
              onChange={(e) => setFilterObjective(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-[#0B1E3B]"
            >
              <option value="todos">Todos os objetivos</option>
              {objectives.map((o) => (
                <option key={o} value={o}>
                  {o.slice(0, 55)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Aplicações no recorte</p>
          <p className="font-display text-2xl font-bold text-[#0B1E3B] mt-1 tabular-nums">{kpis.totalApplied}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {filterYear === 'todos' ? 'Todos os anos' : `Ano ${filterYear}`} ·{' '}
            {filterBimester === 'todos' ? 'Todos os bimestres' : filterBimester}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Objetivos alcançados</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="font-display text-2xl font-bold text-emerald-700 tabular-nums">{kpis.alcancado}</p>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">({kpis.pctAlcancado}%)</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Considerando os apoios do PAEE</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Parcialmente alcançados</p>
          <p className="font-display text-2xl font-bold text-[#2B7DE9] mt-1 tabular-nums">{kpis.parcial}</p>
          <p className="text-xs text-slate-500 mt-0.5">Em consolidação pedagógica</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Apoio predominante</p>
          <p className="font-display text-lg font-bold text-[#0B1E3B] mt-1.5">{kpis.predominant}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {filterSubject === 'todos' ? `${subjectBreakdown.length} componente(s)` : filterSubject}
          </p>
        </div>
      </div>

      {/* Interactive Visual Charts Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-display text-base font-bold text-[#0B1E3B]">
              Acompanhamento visual do desenvolvimento
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Compare o alcance dos objetivos e a redução gradual de apoio ao longo dos bimestres ou por componente curricular.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-[#F6F8FB] border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setChartView('evolucao')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  chartView === 'evolucao' ? 'bg-[#0B1E3B] text-white' : 'text-slate-600 hover:text-[#0B1E3B]'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                Evolução no período
              </button>
              <button
                type="button"
                onClick={() => setChartView('componente')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  chartView === 'componente' ? 'bg-[#0B1E3B] text-white' : 'text-slate-600 hover:text-[#0B1E3B]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Por componente curricular
              </button>
            </div>
          </div>
        </div>

        {chartView === 'evolucao' ? (
          <div className="space-y-4">
            {/* Legend + Grouping Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <span className="w-5 h-0.5 bg-[#2B7DE9] inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block -ml-2" />
                  Alcance do objetivo
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-5 border-t-2 border-dashed border-[#F59E0B] inline-block" />
                  <span className="w-2.5 h-2.5 rotate-45 bg-[#F59E0B] inline-block -ml-2" />
                  Nível de autonomia / apoio
                </span>
              </div>

              <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => {
                    setTrajectoryGrouping('aplicacao');
                    setActivePointId(null);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    trajectoryGrouping === 'aplicacao' ? 'bg-white text-[#0B1E3B] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Por aplicação
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrajectoryGrouping('bimestre');
                    setActivePointId(null);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    trajectoryGrouping === 'bimestre' ? 'bg-white text-[#0B1E3B] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Por bimestre
                </button>
              </div>
            </div>

            {trajectoryPoints.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-[#F6F8FB] p-8 text-center text-sm text-slate-600">
                Nenhum registro de atividade aplicada encontrado para o recorte selecionado. Ajuste os filtros de ano, bimestre ou componente acima.
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full min-w-[600px] h-auto select-none"
                    role="img"
                    aria-label={`Gráfico de evolução pedagógica de ${student.displayName}`}
                  >
                    {/* Qualitative Horizontal Tiers */}
                    {[
                      { level: 3, objText: 'Alcançado', supText: 'Autonomia' },
                      { level: 2, objText: 'Parcialmente', supText: 'Apoio pontual' },
                      { level: 1, objText: 'Ainda não', supText: 'Apoio frequente' },
                    ].map((tier) => {
                      const y = yForLevel(tier.level);
                      return (
                        <g key={tier.level}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={svgW - padR}
                            y2={y}
                            stroke="#E2E8F0"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text x={padL - 12} y={y - 3} textAnchor="end" fontSize="11" fontWeight="600" fill="#0B1E3B">
                            {tier.objText}
                          </text>
                          <text x={padL - 12} y={y + 11} textAnchor="end" fontSize="10" fill="#64748B">
                            {tier.supText}
                          </text>
                        </g>
                      );
                    })}

                    {/* Axis Baseline */}
                    <line
                      x1={padL}
                      y1={padT}
                      x2={padL}
                      y2={padT + plotH}
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />

                    {/* Vertical highlight for active point */}
                    {selectedPoint &&
                      (() => {
                        const idx = trajectoryPoints.findIndex((p) => p.id === selectedPoint.id);
                        if (idx < 0) return null;
                        const cx = xForIndex(idx, trajectoryPoints.length);
                        return (
                          <line
                            x1={cx}
                            y1={padT - 6}
                            x2={cx}
                            y2={padT + plotH + 8}
                            stroke="#2B7DE9"
                            strokeOpacity="0.3"
                            strokeWidth="2"
                          />
                        );
                      })()}

                    {/* Support Trajectory (Dashed Amber Line) */}
                    {trajectoryPoints.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2.25"
                        strokeDasharray="6 4"
                        strokeLinejoin="round"
                        points={supportLinePoints}
                      />
                    )}

                    {/* Objective Trajectory (Solid Blue Line) */}
                    {trajectoryPoints.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#2B7DE9"
                        strokeWidth="2.75"
                        strokeLinejoin="round"
                        points={objectiveLinePoints}
                      />
                    )}

                    {/* Data Nodes */}
                    {trajectoryPoints.map((pt, idx) => {
                      const cx = xForIndex(idx, trajectoryPoints.length);
                      const cyObj = yForLevel(pt.objLevel);
                      const cySup = yForLevel(pt.supLevel);
                      const isSelected = selectedPoint?.id === pt.id;
                      return (
                        <g
                          key={pt.id}
                          className="cursor-pointer"
                          onClick={() => setActivePointId(pt.id)}
                          onMouseEnter={() => setActivePointId(pt.id)}
                        >
                          {/* Invisible wider hit zone */}
                          <rect
                            x={cx - 24}
                            y={padT - 10}
                            width={48}
                            height={plotH + 56}
                            fill="transparent"
                          />

                          {/* Support Diamond */}
                          <polygon
                            points={`${cx},${cySup - 6} ${cx + 6},${cySup} ${cx},${cySup + 6} ${cx - 6},${cySup}`}
                            fill="#F59E0B"
                            stroke="#FFFFFF"
                            strokeWidth="1.75"
                          />

                          {/* Objective Circle */}
                          {isSelected && (
                            <circle cx={cx} cy={cyObj} r="11" fill="#2B7DE9" fillOpacity="0.14" />
                          )}
                          <circle
                            cx={cx}
                            cy={cyObj}
                            r={isSelected ? 6.5 : 5.5}
                            fill={pointDotColor(pt.objLevel)}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />

                          {/* X-Axis Labels */}
                          <text
                            x={cx}
                            y={padT + plotH + 22}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight={isSelected ? '700' : '600'}
                            fill={isSelected ? '#0B1E3B' : '#475569'}
                          >
                            {pt.xLabel}
                          </text>
                          <text
                            x={cx}
                            y={padT + plotH + 37}
                            textAnchor="middle"
                            fontSize="9.5"
                            fill="#64748B"
                          >
                            {pt.subLabel.length > 18 ? `${pt.subLabel.slice(0, 17)}…` : pt.subLabel}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Selected Point Inspection Strip */}
                {selectedPoint && (
                  <div className="rounded-lg border border-slate-200 bg-[#F6F8FB] p-4 text-xs space-y-2">
                    {selectedPoint.singleApp ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[#0B1E3B]">
                            {formatFullDate(selectedPoint.singleApp.appliedDate)} · {selectedPoint.singleApp.bimester}/
                            {selectedPoint.singleApp.schoolYear} · {selectedPoint.singleApp.subject}
                          </span>
                          <span className="text-slate-600">{selectedPoint.singleApp.activityTitle}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          <div className="bg-white border border-slate-200 rounded p-2">
                            <span className="text-slate-500 block">Alcance do objetivo</span>
                            <strong className="text-[#0B1E3B]">
                              {OBJECTIVE_LABELS[selectedPoint.singleApp.objectiveStatus] ||
                                selectedPoint.singleApp.objectiveStatus}
                            </strong>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-2">
                            <span className="text-slate-500 block">Apoio utilizado</span>
                            <strong className="text-[#2B7DE9]">
                              {SUPPORT_LABELS[selectedPoint.singleApp.supportLevel] ||
                                selectedPoint.singleApp.supportLevel}
                            </strong>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-2">
                            <span className="text-slate-500 block">Participação</span>
                            <strong className="text-[#0B1E3B]">
                              {PARTICIPATION_LABELS[selectedPoint.singleApp.participation] ||
                                selectedPoint.singleApp.participation}
                            </strong>
                          </div>
                        </div>
                        {(selectedPoint.singleApp.helpfulResource || selectedPoint.singleApp.briefObservation) && (
                          <p className="text-slate-700 pt-1">
                            {selectedPoint.singleApp.helpfulResource && (
                              <>
                                <strong>Recurso que ajudou:</strong> {selectedPoint.singleApp.helpfulResource}
                                {selectedPoint.singleApp.briefObservation ? ' · ' : ''}
                              </>
                            )}
                            {selectedPoint.singleApp.briefObservation && (
                              <>
                                <strong>Observação:</strong> {selectedPoint.singleApp.briefObservation}
                              </>
                            )}
                          </p>
                        )}
                      </>
                    ) : selectedPoint.periodApps ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[#0B1E3B]">
                            Consolidado de {selectedPoint.xLabel} ({selectedPoint.count} aplicações)
                          </span>
                          <span className="text-slate-600">
                            Tendência: <strong>{levelToObjectiveLabel(selectedPoint.objLevel)}</strong> · Apoio:{' '}
                            <strong className="text-[#2B7DE9]">{levelToSupportLabel(selectedPoint.supLevel)}</strong>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {selectedPoint.periodApps.map((ap) => (
                            <div key={ap.id} className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700">
                              <strong className="text-[#0B1E3B]">{ap.subject}</strong> ({formatShortDate(ap.appliedDate)}):{' '}
                              {OBJECTIVE_LABELS[ap.objectiveStatus]} · {SUPPORT_LABELS[ap.supportLevel]}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Visual Breakdown by Curricular Subject (School & Teacher View) */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#10B981] inline-block" />
                  Alcançado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#2B7DE9] inline-block" />
                  Parcialmente alcançado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#F59E0B] inline-block" />
                  Ainda não alcançado
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                Clique em um componente para filtrar a linha do tempo
              </span>
            </div>

            {subjectBreakdown.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-[#F6F8FB] p-8 text-center text-sm text-slate-600">
                Nenhum registro aplicado encontrado para os filtros de ano e bimestre selecionados.
              </div>
            ) : (
              <div className="space-y-3">
                {subjectBreakdown.map((row) => {
                  const isFocused = filterSubject === row.subject;
                  const pctAlc = Math.round((row.alcancado / row.total) * 100);
                  const pctPar = Math.round((row.parcial / row.total) * 100);
                  const pctNao = Math.round((row.aindaNao / row.total) * 100);
                  const pctObs = Math.max(0, 100 - pctAlc - pctPar - pctNao);

                  return (
                    <button
                      key={row.subject}
                      type="button"
                      onClick={() => setFilterSubject(isFocused ? 'todos' : row.subject)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                        isFocused
                          ? 'border-[#2B7DE9] bg-[#F2F7FF]'
                          : 'border-slate-200 bg-white hover:bg-[#F6F8FB]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div>
                          <span className="font-display text-sm font-bold text-[#0B1E3B]">{row.subject}</span>
                          <span className="ml-2 text-xs text-slate-500 tabular-nums">
                            {row.total} {row.total === 1 ? 'aplicação' : 'aplicações'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                          <span>
                            Último registro:{' '}
                            <strong className="text-[#0B1E3B]">{row.latestStatus}</strong>{' '}
                            <span className="tabular-nums text-slate-500">({formatShortDate(row.latestDate)})</span>
                          </span>
                          <span>
                            Apoio predominante:{' '}
                            <strong className="text-[#2B7DE9]">{row.predominantSupport}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Proportional Stacked Bar */}
                      <div className="w-full h-3.5 rounded-md bg-slate-100 overflow-hidden flex">
                        {row.alcancado > 0 && (
                          <div
                            style={{ width: `${pctAlc}%` }}
                            className="bg-[#10B981] h-full transition-all"
                            title={`Alcançado: ${row.alcancado}`}
                          />
                        )}
                        {row.parcial > 0 && (
                          <div
                            style={{ width: `${pctPar}%` }}
                            className="bg-[#2B7DE9] h-full transition-all"
                            title={`Parcialmente alcançado: ${row.parcial}`}
                          />
                        )}
                        {row.aindaNao > 0 && (
                          <div
                            style={{ width: `${pctNao}%` }}
                            className="bg-[#F59E0B] h-full transition-all"
                            title={`Ainda não alcançado: ${row.aindaNao}`}
                          />
                        )}
                        {row.naoObs > 0 && (
                          <div
                            style={{ width: `${pctObs}%` }}
                            className="bg-slate-300 h-full transition-all"
                            title={`Não observado: ${row.naoObs}`}
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-slate-600 tabular-nums">
                        <div className="flex flex-wrap gap-4">
                          <span>
                            Alcançado: <strong className="text-emerald-700">{row.alcancado}</strong>
                          </span>
                          <span>
                            Parcial: <strong className="text-[#2B7DE9]">{row.parcial}</strong>
                          </span>
                          <span>
                            Ainda não: <strong className="text-amber-700">{row.aindaNao}</strong>
                          </span>
                        </div>
                        <span className="font-semibold text-[#2B7DE9]">
                          {isFocused ? 'Filtro ativo (clique para mostrar todos)' : 'Filtrar por este componente'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity State Distinction Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-display text-sm font-bold text-[#0B1E3B] mb-3">Situação das propostas pedagógicas</h3>
        {filteredActivities.length === 0 ? (
          <p className="text-sm text-slate-500">
            {activities.length === 0
              ? 'Nenhuma proposta gerada ainda na aba Atividades e planos de aula.'
              : 'Nenhuma proposta corresponde aos filtros de ano, bimestre ou componente selecionados.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F8FB] border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Atividade / Plano</th>
                  <th className="py-2.5 px-3 font-semibold">Versão</th>
                  <th className="py-2.5 px-3 font-semibold">Estado no ciclo</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredActivities.map((act) => {
                  const actApps = applications.filter((ap) => ap.activityId === act.id);
                  const appliedApps = actApps.filter((ap) => ap.status === 'aplicada');
                  const stateLabel =
                    appliedApps.length > 0
                      ? `Aplicação com feedback (${appliedApps.length} registro(s))`
                      : actApps.length > 0
                      ? 'Registro marcado como não aplicada'
                      : 'Atividade gerada (aguardando aplicação)';
                  return (
                    <tr key={act.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-[#0B1E3B]">
                        {act.title}
                        <span className="block text-slate-500 font-normal">
                          {act.subject} · {act.bimester} · {act.schoolYear}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">v{act.versionNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{stateLabel}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenFeedbackModal(act)}
                          className="text-[#2B7DE9] font-semibold hover:underline cursor-pointer"
                        >
                          Registrar como foi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comparative Timeline by Objective */}
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-[#0B1E3B]">
          Linha do tempo e comparação por objetivo (considerando os apoios utilizados)
        </h3>
        {objectiveGroups.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            Nenhum registro de aplicação corresponde aos filtros selecionados.
          </div>
        ) : (
          objectiveGroups.map(([objText, entries]) => (
            <div key={objText} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <p className="text-xs font-semibold text-[#2B7DE9]">Objetivo acompanhado</p>
                <h4 className="font-display text-base font-bold text-[#0B1E3B] mt-0.5">{objText}</h4>
              </div>
              <div className="space-y-3">
                {entries
                  .slice()
                  .sort((a, b) => a.appliedDate.localeCompare(b.appliedDate))
                  .map((ap) => (
                    <div key={ap.id} className="p-4 rounded-lg border border-slate-200 bg-[#F6F8FB] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#0B1E3B] tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-[#2B7DE9]" />
                          {formatFullDate(ap.appliedDate)} · {ap.bimester}/{ap.schoolYear} · {ap.subject}
                        </span>
                        <span>
                          {ap.activityTitle} (v{ap.activityVersion}) · {ap.teacherName}
                        </span>
                      </div>
                      {ap.status === 'nao_aplicada' ? (
                        <p className="text-sm font-medium text-slate-700">
                          Situação: <strong>Não aplicada</strong>
                          {ap.briefObservation ? ` — ${ap.briefObservation}` : ''}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-white border border-slate-200 rounded p-2.5">
                            <span className="text-slate-500 block">Participação</span>
                            <strong className="text-[#0B1E3B]">
                              {PARTICIPATION_LABELS[ap.participation] || ap.participation}
                            </strong>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-2.5">
                            <span className="text-slate-500 block">Objetivo</span>
                            <strong className="text-[#0B1E3B]">
                              {OBJECTIVE_LABELS[ap.objectiveStatus] || ap.objectiveStatus}
                            </strong>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-2.5">
                            <span className="text-slate-500 block">Apoio utilizado</span>
                            <strong className="text-[#2B7DE9]">
                              {SUPPORT_LABELS[ap.supportLevel] || ap.supportLevel}
                            </strong>
                          </div>
                        </div>
                      )}
                      {(ap.helpfulResource || ap.briefObservation || ap.nextStep) && (
                        <div className="text-xs text-slate-700 space-y-1 pt-1">
                          {ap.helpfulResource && (
                            <p>
                              <strong>Recurso que ajudou:</strong> {ap.helpfulResource}
                            </p>
                          )}
                          {ap.briefObservation && (
                            <p>
                              <strong>Observação breve:</strong> {ap.briefObservation}
                            </p>
                          )}
                          {ap.nextStep && (
                            <p>
                              <strong>Próximo passo:</strong> {ap.nextStep}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
