import React from 'react';
import type { ActivityExercise, VisualAidCard } from '../types';

interface ActivityVisualAidProps {
  spec: NonNullable<ActivityExercise['visualAidSpec']>;
  exerciseItems?: string[];
  isNonLiterate?: boolean;
}

function resolveIconKey(iconHint?: string, labelText = ''): string {
  const raw = `${iconHint || ''} ${labelText}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/sol\b|solar|estrela|luz|calor|evapor/.test(raw)) return 'sol';
  if (/chuva|nuvem|condens|precipit|clima|tempo/.test(raw)) return 'chuva';
  if (/agua|rio|mar|lago|gota|oceano|regar|torneira/.test(raw)) return 'agua';
  if (/saturno|anel|aneis/.test(raw)) return 'saturno';
  if (/terra|planeta|mundo|globo|marte|jupiter|lua|espaco|astro/.test(raw)) return 'terra';
  if (/escola|aula|sala|estudar|professor|quadro/.test(raw)) return 'escola';
  if (/casa|moradia|lar|familia|quarto|cozinha/.test(raw)) return 'casa';
  if (/saude|posto|hospital|medico|cuidado|remedio/.test(raw)) return 'saude';
  if (/cidade|bairro|predio|comercio|padaria|mercado|rua|comunidade/.test(raw)) return 'cidade';
  if (/praca|parque|arvore|floresta|bosque|mata/.test(raw)) return 'arvore';
  if (/planta|horta|folha|raiz|semente|alface|brot|flor|jardim/.test(raw)) return 'planta';
  if (/peixe|tubarao|baleia|polvo|aquat/.test(raw)) return 'peixe';
  if (/borboleta|inseto|abelha|formiga|invertebrad|caracol|minhoca/.test(raw)) return 'borboleta';
  if (/passaro|ave|arara|voa|asa|galinha|pato/.test(raw)) return 'passaro';
  if (/animal|cachorro|gato|macaco|sapo|tatu|vertebrad|mamifero|bicho|fauna|morcego/.test(raw)) return 'animal';
  if (/livro|leitura|texto|historia|palavra|letra|silaba|ler|escrita/.test(raw)) return 'livro';
  if (/lapis|escrever|desenho|caderno|atividade|anotar/.test(raw)) return 'lapis';
  if (/relogio|hora|minuto|rotina|primeiro|depois|fim|dia|manha|noite/.test(raw)) return 'relogio';
  if (/coracao|sentimento|emocao|respeito|amizade|cooper|junto|ajudar/.test(raw)) return 'coracao';
  if (/musica|som|cantiga|ritmo|instrumento|ouvir/.test(raw)) return 'musica';
  if (/bola|jogo|esporte|brincadeira|quadra|educacao fisica|balao/.test(raw)) return 'bola';
  if (/fruta|maca|alimento|comida|lanche|nutricao/.test(raw)) return 'fruta';
  if (/numero|conta|soma|subtra|matematica|calculo|medida|fracao|escala|abaco/.test(raw)) return 'numeros';
  if (/forma|quadrado|circulo|triangulo|geometr|retangulo/.test(raw)) return 'formas';
  if (/mapa|regiao|pais|brasil|geografia|caminho|rota|local/.test(raw)) return 'mapa';
  if (/ciencia|lupa|observar|experimento|pesquisa|descobrir|analise/.test(raw)) return 'lupa';
  if (/mao|apontar|tocar|sinal|libras|caa|gesto/.test(raw)) return 'mao';
  return 'estrela';
}

const EducationalIconSvg: React.FC<{ iconKey: string; size?: number }> = ({ iconKey, size = 56 }) => {
  switch (iconKey) {
    case 'sol':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <circle cx="32" cy="32" r="14" fill="#FACC15" stroke="#B45309" strokeWidth="2.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="32"
              y1="6"
              x2="32"
              y2="13"
              stroke="#F59E0B"
              strokeWidth="3.5"
              strokeLinecap="round"
              transform={`rotate(${deg} 32 32)`}
            />
          ))}
        </svg>
      );
    case 'chuva':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <path
            d="M18 38h28a10 10 0 0 0 1-20 14 14 0 0 0-27-3 9 9 0 0 0-2 23z"
            fill="#E0F2FE"
            stroke="#0284C7"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <line x1="22" y1="45" x2="19" y2="54" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
          <line x1="32" y1="45" x2="29" y2="55" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
          <line x1="42" y1="45" x2="39" y2="54" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'agua':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <path
            d="M32 10C24 22 16 31 16 40a16 16 0 0 0 32 0c0-9-8-18-16-30z"
            fill="#60A5FA"
            stroke="#1D4ED8"
            strokeWidth="2.5"
          />
          <path d="M24 41a8 8 0 0 0 6 7" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'planta':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <rect x="20" y="44" width="24" height="12" rx="3" fill="#B45309" stroke="#78350F" strokeWidth="2" />
          <line x1="32" y1="44" x2="32" y2="20" stroke="#15803D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M32 32C20 32 14 23 16 16c9 0 16 6 16 16z" fill="#4ADE80" stroke="#15803D" strokeWidth="2" />
          <path d="M32 28c12 0 18-9 16-16-9 0-16 6-16 16z" fill="#22C55E" stroke="#15803D" strokeWidth="2" />
        </svg>
      );
    case 'arvore':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <rect x="27" y="38" width="10" height="18" rx="2" fill="#92400E" stroke="#451A03" strokeWidth="2" />
          <circle cx="32" cy="24" r="16" fill="#22C55E" stroke="#166534" strokeWidth="2.5" />
          <circle cx="21" cy="30" r="10" fill="#4ADE80" stroke="#166534" strokeWidth="2" />
          <circle cx="43" cy="30" r="10" fill="#4ADE80" stroke="#166534" strokeWidth="2" />
        </svg>
      );
    case 'escola':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <polygon points="32,10 8,26 56,26" fill="#2B7DE9" stroke="#0B1E3B" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="12" y="26" width="40" height="28" fill="#EFF6FF" stroke="#0B1E3B" strokeWidth="2.5" />
          <rect x="27" y="38" width="10" height="16" fill="#F59E0B" stroke="#0B1E3B" strokeWidth="2" />
          <rect x="17" y="32" width="7" height="7" fill="#93C5FD" stroke="#0B1E3B" strokeWidth="1.5" />
          <rect x="40" y="32" width="7" height="7" fill="#93C5FD" stroke="#0B1E3B" strokeWidth="1.5" />
          <circle cx="32" cy="19" r="3.5" fill="#FACC15" />
        </svg>
      );
    case 'casa':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <polygon points="32,12 10,30 54,30" fill="#F59E0B" stroke="#78350F" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="15" y="30" width="34" height="24" fill="#FEF3C7" stroke="#78350F" strokeWidth="2.5" />
          <rect x="27" y="39" width="10" height="15" fill="#92400E" />
          <rect x="19" y="35" width="6" height="6" fill="#60A5FA" stroke="#0B1E3B" strokeWidth="1.5" />
        </svg>
      );
    case 'cidade':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <rect x="10" y="24" width="18" height="30" fill="#DBEAFE" stroke="#0B1E3B" strokeWidth="2.2" />
          <rect x="28" y="12" width="24" height="42" fill="#93C5FD" stroke="#0B1E3B" strokeWidth="2.2" />
          <rect x="15" y="30" width="4" height="5" fill="#0B1E3B" />
          <rect x="21" y="30" width="4" height="5" fill="#0B1E3B" />
          <rect x="33" y="18" width="5" height="6" fill="#FFFFFF" />
          <rect x="42" y="18" width="5" height="6" fill="#FFFFFF" />
          <rect x="33" y="28" width="5" height="6" fill="#FFFFFF" />
          <rect x="42" y="28" width="5" height="6" fill="#FFFFFF" />
          <rect x="36" y="42" width="8" height="12" fill="#0B1E3B" />
        </svg>
      );
    case 'saude':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <rect x="12" y="14" width="40" height="36" rx="8" fill="#FEF2F2" stroke="#DC2626" strokeWidth="2.5" />
          <rect x="28" y="21" width="8" height="22" rx="2" fill="#DC2626" />
          <rect x="21" y="28" width="22" height="8" rx="2" fill="#DC2626" />
        </svg>
      );
    case 'terra':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <circle cx="32" cy="32" r="20" fill="#2563EB" stroke="#0B1E3B" strokeWidth="2.5" />
          <path d="M21 22c5-2 10 1 11 6s-4 8-8 8-6-5-3-14z" fill="#4ADE80" />
          <path d="M36 28c6-1 11 3 10 9s-7 8-11 6-3-14 1-15z" fill="#22C55E" />
        </svg>
      );
    case 'saturno':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <ellipse cx="32" cy="33" rx="26" ry="8" fill="none" stroke="#D97706" strokeWidth="4" transform="rotate(-18 32 33)" />
          <circle cx="32" cy="32" r="14" fill="#FDE68A" stroke="#92400E" strokeWidth="2.5" />
          <path d="M10 40c8 3 34-5 44-14" fill="none" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    case 'peixe':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <polygon points="10,22 22,32 10,42" fill="#38BDF8" stroke="#0369A1" strokeWidth="2.2" strokeLinejoin="round" />
          <ellipse cx="36" cy="32" rx="18" ry="12" fill="#7DD3FC" stroke="#0369A1" strokeWidth="2.5" />
          <circle cx="44" cy="29" r="2.5" fill="#0B1E3B" />
          <path d="M30 24c-3 5-3 11 0 16" fill="none" stroke="#0369A1" strokeWidth="2" />
        </svg>
      );
    case 'borboleta':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <ellipse cx="21" cy="25" rx="11" ry="10" fill="#FDE047" stroke="#A16207" strokeWidth="2.2" />
          <ellipse cx="43" cy="25" rx="11" ry="10" fill="#FDE047" stroke="#A16207" strokeWidth="2.2" />
          <ellipse cx="22" cy="40" rx="8" ry="8" fill="#FB923C" stroke="#9A3412" strokeWidth="2.2" />
          <ellipse cx="42" cy="40" rx="8" ry="8" fill="#FB923C" stroke="#9A3412" strokeWidth="2.2" />
          <rect x="29.5" y="19" width="5" height="27" rx="2.5" fill="#0B1E3B" />
          <path d="M30 19c-2-5-5-6-7-6M34 19c2-5 5-6 7-6" fill="none" stroke="#0B1E3B" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'passaro':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <ellipse cx="32" cy="36" rx="16" ry="12" fill="#60A5FA" stroke="#1E3A8A" strokeWidth="2.4" />
          <circle cx="44" cy="24" r="9" fill="#93C5FD" stroke="#1E3A8A" strokeWidth="2.4" />
          <polygon points="52,22 60,25 52,28" fill="#F59E0B" stroke="#92400E" strokeWidth="1.5" />
          <circle cx="46" cy="22" r="2" fill="#0B1E3B" />
          <path d="M24 34c4-6 11-6 14 0" fill="#2563EB" stroke="#1E3A8A" strokeWidth="2" />
        </svg>
      );
    case 'animal':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <circle cx="32" cy="39" r="12" fill="#F59E0B" stroke="#78350F" strokeWidth="2.4" />
          <circle cx="17" cy="25" r="6" fill="#FBBF24" stroke="#78350F" strokeWidth="2.2" />
          <circle cx="27" cy="18" r="6" fill="#FBBF24" stroke="#78350F" strokeWidth="2.2" />
          <circle cx="38" cy="18" r="6" fill="#FBBF24" stroke="#78350F" strokeWidth="2.2" />
          <circle cx="48" cy="25" r="6" fill="#FBBF24" stroke="#78350F" strokeWidth="2.2" />
        </svg>
      );
    case 'livro':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <path d="M10 18c8-3 16-2 22 3 6-5 14-6 22-3v30c-8-3-16-2-22 3-6-5-14-6-22-3z" fill="#EFF6FF" stroke="#1E3A8A" strokeWidth="2.5" strokeLinejoin="round" />
          <line x1="32" y1="21" x2="32" y2="51" stroke="#1E3A8A" strokeWidth="2.5" />
          <line x1="16" y1="28" x2="26" y2="28" stroke="#2B7DE9" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="16" y1="35" x2="26" y2="35" stroke="#2B7DE9" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="38" y1="28" x2="48" y2="28" stroke="#2B7DE9" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="38" y1="35" x2="48" y2="35" stroke="#2B7DE9" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'lapis':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <polygon points="14,50 18,36 44,10 54,20 28,46" fill="#FACC15" stroke="#78350F" strokeWidth="2.4" strokeLinejoin="round" />
          <polygon points="14,50 18,36 28,46" fill="#FDE68A" stroke="#78350F" strokeWidth="2" />
          <polygon points="14,50 16,44 20,48" fill="#0B1E3B" />
        </svg>
      );
    case 'relogio':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <circle cx="32" cy="32" r="21" fill="#EFF6FF" stroke="#0B1E3B" strokeWidth="2.6" />
          <line x1="32" y1="32" x2="32" y2="19" stroke="#0B1E3B" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="32" y1="32" x2="43" y2="36" stroke="#2B7DE9" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="32" cy="32" r="3" fill="#F59E0B" />
        </svg>
      );
    case 'coracao':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <path
            d="M32 52S12 39 12 24a11 11 0 0 1 20-6 11 11 0 0 1 20 6c0 15-20 28-20 28z"
            fill="#F87171"
            stroke="#991B1B"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'musica':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <path d="M26 44V18l22-5v26" fill="none" stroke="#0B1E3B" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="46" r="7" fill="#2B7DE9" stroke="#0B1E3B" strokeWidth="2.2" />
          <circle cx="42" cy="41" r="7" fill="#F59E0B" stroke="#0B1E3B" strokeWidth="2.2" />
        </svg>
      );
    case 'bola':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <circle cx="32" cy="32" r="20" fill="#FEF3C7" stroke="#0B1E3B" strokeWidth="2.5" />
          <polygon points="32,20 42,27 38,39 26,39 22,27" fill="#2B7DE9" stroke="#0B1E3B" strokeWidth="2" />
        </svg>
      );
    case 'fruta':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <path d="M32 22c-10-4-19 4-18 16 1 11 9 18 18 15 9 3 17-4 18-15 1-12-8-20-18-16z" fill="#EF4444" stroke="#991B1B" strokeWidth="2.4" />
          <path d="M32 20c1-6 4-9 8-10" fill="none" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <path d="M33 17c5-6 12-5 13-1-4 4-9 4-13 1z" fill="#22C55E" stroke="#166534" strokeWidth="1.5" />
        </svg>
      );
    case 'numeros':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <rect x="10" y="12" width="20" height="20" rx="5" fill="#DBEAFE" stroke="#1E40AF" strokeWidth="2.2" />
          <text x="20" y="27" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0B1E3B">1</text>
          <rect x="34" y="12" width="20" height="20" rx="5" fill="#FEF3C7" stroke="#B45309" strokeWidth="2.2" />
          <text x="44" y="27" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0B1E3B">2</text>
          <rect x="22" y="34" width="20" height="20" rx="5" fill="#DCFCE7" stroke="#166534" strokeWidth="2.2" />
          <text x="32" y="49" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0B1E3B">3</text>
        </svg>
      );
    case 'formas':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <rect x="10" y="32" width="20" height="20" rx="2" fill="#DBEAFE" stroke="#1E3A8A" strokeWidth="2.2" />
          <circle cx="44" cy="42" r="11" fill="#FEF3C7" stroke="#92400E" strokeWidth="2.2" />
          <polygon points="32,10 44,28 20,28" fill="#DCFCE7" stroke="#166534" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );
    case 'mapa':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <polygon points="10,18 24,13 40,18 54,13 54,47 40,52 24,47 10,52" fill="#ECFDF5" stroke="#047857" strokeWidth="2.4" strokeLinejoin="round" />
          <line x1="24" y1="13" x2="24" y2="47" stroke="#047857" strokeWidth="2" />
          <line x1="40" y1="18" x2="40" y2="52" stroke="#047857" strokeWidth="2" />
          <circle cx="32" cy="30" r="5" fill="#EF4444" />
        </svg>
      );
    case 'lupa':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <circle cx="28" cy="28" r="15" fill="#E0F2FE" stroke="#0B1E3B" strokeWidth="3" />
          <line x1="39" y1="39" x2="53" y2="53" stroke="#0B1E3B" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case 'mao':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <rect x="20" y="28" width="24" height="24" rx="10" fill="#FDE68A" stroke="#92400E" strokeWidth="2.4" />
          <rect x="28" y="10" width="7" height="22" rx="3.5" fill="#FDE68A" stroke="#92400E" strokeWidth="2.2" />
          <circle cx="31.5" cy="12" r="2.5" fill="#2B7DE9" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <polygon
            points="32,8 39,23 56,25 43,36 47,53 32,44 17,53 21,36 8,25 25,23"
            fill="#FACC15"
            stroke="#B45309"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

function cleanItemLabel(item: string): string {
  return item
    .replace(/^[\(\[]\s*[xX]?\s*[\)\]]\s*/, '')
    .replace(/^[•\-–—]\s*/, '')
    .replace(/^\d+[\.\)]\s*/, '')
    .trim();
}

export function deriveVisualCards(
  spec: NonNullable<ActivityExercise['visualAidSpec']>,
  exerciseItems: string[] = []
): VisualAidCard[] {
  if (Array.isArray(spec.cards) && spec.cards.length > 0) {
    return spec.cards.slice(0, 4);
  }

  const fromItems = exerciseItems
    .map(cleanItemLabel)
    .filter((s) => s.length > 0 && s.length <= 72)
    .slice(0, 4)
    .map((label) => ({
      label,
      icon: resolveIconKey(undefined, label),
    }));

  if (fromItems.length >= 2) {
    return fromItems;
  }

  if (spec.type === 'sequencia_visual') {
    return [
      { label: '1. Observar', sublabel: 'Ler e identificar', icon: 'lupa' },
      { label: '2. Realizar', sublabel: 'Aplicar a estratégia', icon: 'lapis' },
      { label: '3. Conferir', sublabel: 'Validar a resposta', icon: 'estrela' },
    ];
  }

  if (spec.type === 'ciclo_natureza') {
    return [
      { label: 'Etapa 1', sublabel: 'Início do processo', icon: 'sol' },
      { label: 'Etapa 2', sublabel: 'Transformação', icon: 'chuva' },
      { label: 'Etapa 3', sublabel: 'Continuidade', icon: 'agua' },
    ];
  }

  if (spec.type === 'tabela_classificacao') {
    return [
      { label: 'Grupo A', sublabel: 'Classificar itens aqui', icon: 'animal' },
      { label: 'Grupo B', sublabel: 'Classificar itens aqui', icon: 'borboleta' },
    ];
  }

  return [
    { label: spec.caption ? spec.caption.slice(0, 36) : 'Elemento 1', icon: resolveIconKey(undefined, spec.caption) },
    { label: 'Elemento 2', icon: 'estrela' },
  ];
}

export const ActivityVisualAid: React.FC<ActivityVisualAidProps> = ({
  spec,
  exerciseItems = [],
  isNonLiterate = false,
}) => {
  if (!spec || !spec.type || spec.type === 'nenhum') return null;
  const fmt = (txt: string) => (isNonLiterate ? txt.toUpperCase() : txt);
  const cards = deriveVisualCards(spec, exerciseItems);

  if (spec.imageUrl) {
    return (
      <div className="my-3.5 p-4 rounded-xl border-2 border-[#0B1E3B]/20 bg-white space-y-3">
        <div className="flex justify-center bg-white rounded-lg p-1">
          <img
            src={spec.imageUrl}
            alt={fmt(spec.caption || 'Ilustração didática da atividade')}
            className="w-full max-w-[520px] max-h-[340px] object-contain rounded-lg border border-slate-200 bg-white block"
          />
        </div>
        {spec.cards && spec.cards.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {spec.cards.slice(0, 4).map((card, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 rounded-lg border border-[#2B7DE9]/40 bg-[#F2F7FF] text-xs font-semibold text-[#0B1E3B]"
              >
                <span>{fmt(card.label)}</span>
                {card.sublabel ? <span className="text-slate-600 font-normal"> · {fmt(card.sublabel)}</span> : null}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 text-xs text-slate-600">
          <span>
            <strong>{fmt(spec.caption)}</strong>
            {spec.sourceCitation ? ` · ${fmt(spec.sourceCitation)}` : ''}
          </span>
        </div>
        {spec.teacherInsertionNote && (
          <p className="text-xs text-[#0B1E3B] font-medium bg-[#E6F0FD]/70 px-3 py-1.5 rounded-lg">
            {fmt(spec.teacherInsertionNote)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="my-3.5 p-4 rounded-xl border-2 border-[#0B1E3B]/20 bg-[#F8FAFC] space-y-3">
      {spec.type === 'sistema_solar' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(cards.length >= 2 && cards.some((c) => /sol|terra|lua|marte|saturno|jupiter|planeta/i.test(c.label))
            ? cards
            : [
                { label: 'Sol', sublabel: 'Estrela central', icon: 'sol' },
                { label: 'Terra', sublabel: 'Nosso planeta', icon: 'terra' },
                { label: 'Marte', sublabel: 'Planeta vermelho', icon: 'estrela' },
                { label: 'Saturno', sublabel: 'Planeta com anéis', icon: 'saturno' },
              ]
          ).map((card, idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-[#2B7DE9]/40 rounded-xl p-3 flex flex-col items-center text-center gap-1.5"
            >
              <EducationalIconSvg iconKey={resolveIconKey(card.icon, card.label)} size={54} />
              <p className="font-display text-sm font-bold text-[#0B1E3B] leading-tight">{fmt(card.label)}</p>
              {card.sublabel && <p className="text-[11px] text-slate-600 leading-snug">{fmt(card.sublabel)}</p>}
            </div>
          ))}
        </div>
      )}

      {spec.type === 'sequencia_visual' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {cards.slice(0, 4).map((step, idx, arr) => (
            <React.Fragment key={idx}>
              <div className="flex-1 bg-white border-2 border-[#2B7DE9] rounded-xl p-3 flex flex-col items-center text-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-[#0B1E3B] text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <EducationalIconSvg iconKey={resolveIconKey(step.icon, step.label)} size={46} />
                <p className="font-display text-xs sm:text-sm font-bold text-[#0B1E3B] leading-tight">{fmt(step.label)}</p>
                {step.sublabel && <p className="text-[11px] text-slate-600 leading-snug">{fmt(step.sublabel)}</p>}
              </div>
              {idx < arr.length - 1 && (
                <div className="flex items-center justify-center text-[#2B7DE9] font-bold text-xl select-none">
                  <span className="hidden sm:inline">→</span>
                  <span className="sm:hidden">↓</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {spec.type === 'ciclo_natureza' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cards.slice(0, 3).map((node, idx) => (
              <div
                key={idx}
                className="relative bg-white border-2 border-emerald-600/50 rounded-xl p-3 flex flex-col items-center text-center gap-1.5"
              >
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                  {fmt(`Fase ${idx + 1}`)}
                </span>
                <EducationalIconSvg iconKey={resolveIconKey(node.icon, node.label)} size={50} />
                <p className="font-display text-sm font-bold text-[#0B1E3B] leading-tight">{fmt(node.label)}</p>
                {node.sublabel && <p className="text-[11px] text-slate-600 leading-snug">{fmt(node.sublabel)}</p>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
            <span>↻</span>
            <span>{fmt('Ciclo contínuo: observe a ordem das fases acima')}</span>
          </div>
        </div>
      )}

      {spec.type === 'tabela_classificacao' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.slice(0, 2).map((col, idx) => (
            <div key={idx} className="bg-white border-2 border-[#0B1E3B] rounded-xl overflow-hidden">
              <div
                className={`px-3 py-2.5 flex items-center gap-2.5 border-b-2 border-[#0B1E3B] ${
                  idx === 0 ? 'bg-[#E6F0FD]' : 'bg-[#FEF3C7]'
                }`}
              >
                <EducationalIconSvg iconKey={resolveIconKey(col.icon, col.label)} size={38} />
                <div>
                  <p className="font-display text-sm font-bold text-[#0B1E3B] leading-tight">{fmt(col.label)}</p>
                  {col.sublabel && <p className="text-[11px] text-slate-700">{fmt(col.sublabel)}</p>}
                </div>
              </div>
              <div className="p-3 space-y-3">
                <div className="h-7 border-b border-dashed border-slate-400" />
                <div className="h-7 border-b border-dashed border-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {spec.type === 'linha_numerica' && (
        <div className="bg-white border-2 border-[#2B7DE9]/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {Array.from({ length: 11 }).map((_, n) => (
              <div key={n} className="flex flex-col items-center min-w-[28px]">
                <div className="w-7 h-7 rounded-lg border-2 border-[#0B1E3B] bg-[#F8FAFC] flex items-center justify-center font-mono text-xs font-bold text-[#0B1E3B]">
                  {n}
                </div>
                <div className="w-0.5 h-2.5 bg-[#0B1E3B]" />
              </div>
            ))}
          </div>
          <div className="h-1 bg-[#2B7DE9] rounded-full -mt-4" />
          {cards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {cards.slice(0, 2).map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[#F2F7FF] border border-[#2B7DE9]/30">
                  <EducationalIconSvg iconKey={resolveIconKey(c.icon, c.label)} size={32} />
                  <span className="text-xs font-semibold text-[#0B1E3B]">{fmt(c.label)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {spec.type === 'mapa_conceitual' && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-xl bg-[#0B1E3B] text-white font-display text-sm font-bold text-center shadow-sm">
              {fmt(spec.caption || 'Tema central')}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cards.slice(0, 3).map((branch, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-[#2B7DE9] rounded-xl p-3 flex items-center gap-3"
              >
                <EducationalIconSvg iconKey={resolveIconKey(branch.icon, branch.label)} size={44} />
                <div>
                  <p className="font-display text-sm font-bold text-[#0B1E3B] leading-tight">{fmt(branch.label)}</p>
                  {branch.sublabel && <p className="text-[11px] text-slate-600 mt-0.5">{fmt(branch.sublabel)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {spec.type === 'figura_geometrica' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border-2 border-[#0B1E3B]/25 rounded-xl p-3 flex flex-col items-center gap-2">
            <svg viewBox="0 0 80 80" width="60" height="60" aria-hidden="true">
              <rect x="12" y="12" width="56" height="56" rx="4" fill="#DBEAFE" stroke="#0B1E3B" strokeWidth="3" />
            </svg>
            <span className="font-display text-xs font-bold text-[#0B1E3B]">
              {fmt(cards[0]?.label || 'Quadrado')}
            </span>
          </div>
          <div className="bg-white border-2 border-[#0B1E3B]/25 rounded-xl p-3 flex flex-col items-center gap-2">
            <svg viewBox="0 0 80 80" width="60" height="60" aria-hidden="true">
              <circle cx="40" cy="40" r="28" fill="#FEF3C7" stroke="#0B1E3B" strokeWidth="3" />
            </svg>
            <span className="font-display text-xs font-bold text-[#0B1E3B]">
              {fmt(cards[1]?.label || 'Círculo')}
            </span>
          </div>
          <div className="bg-white border-2 border-[#0B1E3B]/25 rounded-xl p-3 flex flex-col items-center gap-2">
            <svg viewBox="0 0 80 80" width="60" height="60" aria-hidden="true">
              <polygon points="40,10 70,66 10,66" fill="#DCFCE7" stroke="#0B1E3B" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <span className="font-display text-xs font-bold text-[#0B1E3B]">
              {fmt(cards[2]?.label || 'Triângulo')}
            </span>
          </div>
        </div>
      )}

      {spec.type === 'cartao_associacao' && (
        <div className={`grid grid-cols-1 ${cards.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
          {cards.slice(0, 4).map((card, idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-[#2B7DE9] rounded-xl p-3.5 flex items-center gap-3 shadow-xs"
            >
              <div className="shrink-0 w-14 h-14 rounded-lg bg-[#F2F7FF] border border-[#2B7DE9]/30 flex items-center justify-center">
                <EducationalIconSvg iconKey={resolveIconKey(card.icon, card.label)} size={48} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-[#0B1E3B] leading-snug break-words">
                  {fmt(card.label)}
                </p>
                {card.sublabel && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug break-words">{fmt(card.sublabel)}</p>
                )}
              </div>
              <div
                aria-hidden="true"
                className="shrink-0 w-6 h-6 rounded border-2 border-[#0B1E3B] bg-white"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 text-xs text-slate-600">
        <span>
          <strong>{fmt(spec.caption)}</strong>
          {spec.sourceCitation ? ` · ${fmt(spec.sourceCitation)}` : ''}
        </span>
      </div>
      {spec.teacherInsertionNote && (
        <p className="text-xs text-[#0B1E3B] font-medium bg-[#E6F0FD]/70 px-3 py-1.5 rounded-lg">
          {fmt(spec.teacherInsertionNote)}
        </p>
      )}
    </div>
  );
};
