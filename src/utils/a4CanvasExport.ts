import type { ActivityExercise, PedagogicalActivity } from '../types';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function loadImageAsync(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawVisualAidOnCanvas(
  ctx: CanvasRenderingContext2D,
  spec: NonNullable<ActivityExercise['visualAidSpec']>,
  x: number,
  y: number,
  width: number,
  isNonLiterate: boolean,
  preloadedImage?: HTMLImageElement | null
): number {
  const fmt = (txt: string) => (isNonLiterate ? txt.toUpperCase() : txt);
  if (preloadedImage) {
    const boxHeight = 360;
    ctx.save();
    ctx.strokeStyle = '#0B1E3B';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, width, boxHeight);
    ctx.strokeRect(x, y, width, boxHeight);

    const availW = width - 48;
    const availH = boxHeight - 62;
    const scale = Math.min(availW / preloadedImage.width, availH / preloadedImage.height);
    const drawW = preloadedImage.width * scale;
    const drawH = preloadedImage.height * scale;
    const dx = x + (width - drawW) / 2;
    const dy = y + 14 + (availH - drawH) / 2;
    ctx.drawImage(preloadedImage, dx, dy, drawW, drawH);

    ctx.fillStyle = '#475569';
    ctx.font = '15px sans-serif';
    ctx.fillText(fmt(`${spec.caption}${spec.sourceCitation ? ` · ${spec.sourceCitation}` : ''}`).slice(0, 110), x + 16, y + boxHeight - 14);
    ctx.restore();
    return y + boxHeight + 22;
  }

  const cards = (spec.cards && spec.cards.length > 0 ? spec.cards : []).slice(0, 4);
  const boxHeight = spec.type === 'tabela_classificacao' ? 210 : 185;
  ctx.save();
  ctx.strokeStyle = '#0B1E3B';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(x, y, width, boxHeight);
  ctx.strokeRect(x, y, width, boxHeight);

  if (spec.type === 'sistema_solar') {
    const items =
      cards.length >= 2
        ? cards
        : [
            { label: 'Sol', sublabel: 'Estrela' },
            { label: 'Terra', sublabel: 'Nosso planeta' },
            { label: 'Marte', sublabel: 'Planeta vermelho' },
            { label: 'Saturno', sublabel: 'Com anéis' },
          ];
    const colors = ['#F59E0B', '#2563EB', '#DC2626', '#D97706'];
    const colW = (width - 40) / items.length;
    items.forEach((item, idx) => {
      const cx = x + 20 + colW * idx + colW / 2;
      ctx.fillStyle = colors[idx % colors.length];
      ctx.beginPath();
      ctx.arc(cx, y + 66, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0B1E3B';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fmt(item.label).slice(0, 20), cx, y + 122);
      if (item.sublabel) {
        ctx.fillStyle = '#475569';
        ctx.font = '14px sans-serif';
        ctx.fillText(fmt(item.sublabel).slice(0, 24), cx, y + 144);
      }
      ctx.textAlign = 'left';
    });
  } else if (spec.type === 'sequencia_visual' || spec.type === 'ciclo_natureza') {
    const steps =
      cards.length >= 2
        ? cards.slice(0, 3)
        : [
            { label: '1. Observar', sublabel: 'Ler o comando' },
            { label: '2. Realizar', sublabel: 'Aplicar estratégia' },
            { label: '3. Conferir', sublabel: 'Validar resposta' },
          ];
    const stepW = (width - 80) / steps.length;
    steps.forEach((step, idx) => {
      const bx = x + 20 + idx * (stepW + 20);
      ctx.fillStyle = spec.type === 'ciclo_natureza' ? '#ECFDF5' : '#E6F0FD';
      ctx.fillRect(bx, y + 26, stepW, 110);
      ctx.strokeStyle = spec.type === 'ciclo_natureza' ? '#059669' : '#2B7DE9';
      ctx.strokeRect(bx, y + 26, stepW, 110);
      ctx.fillStyle = '#0B1E3B';
      ctx.font = 'bold 17px sans-serif';
      wrapCanvasText(ctx, fmt(`${idx + 1}. ${step.label}`), bx + 12, y + 54, stepW - 24, 22);
      if (step.sublabel) {
        ctx.fillStyle = '#334155';
        ctx.font = '14px sans-serif';
        wrapCanvasText(ctx, fmt(step.sublabel), bx + 12, y + 98, stepW - 24, 18);
      }
    });
  } else if (spec.type === 'tabela_classificacao') {
    const cols =
      cards.length >= 2
        ? cards.slice(0, 2)
        : [
            { label: 'Grupo A', sublabel: '' },
            { label: 'Grupo B', sublabel: '' },
          ];
    const colW = (width - 56) / 2;
    cols.forEach((col, idx) => {
      const bx = x + 20 + idx * (colW + 16);
      ctx.fillStyle = idx === 0 ? '#E6F0FD' : '#FEF3C7';
      ctx.fillRect(bx, y + 20, colW, 46);
      ctx.strokeStyle = '#0B1E3B';
      ctx.strokeRect(bx, y + 20, colW, 146);
      ctx.beginPath();
      ctx.moveTo(bx, y + 66);
      ctx.lineTo(bx + colW, y + 66);
      ctx.moveTo(bx + 14, y + 112);
      ctx.lineTo(bx + colW - 14, y + 112);
      ctx.moveTo(bx + 14, y + 148);
      ctx.lineTo(bx + colW - 14, y + 148);
      ctx.stroke();
      ctx.fillStyle = '#0B1E3B';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(fmt(col.label).slice(0, 28), bx + 14, y + 50);
    });
  } else if (spec.type === 'linha_numerica') {
    const lineY = y + 96;
    ctx.strokeStyle = '#2B7DE9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 36, lineY);
    ctx.lineTo(x + width - 36, lineY);
    ctx.stroke();
    ctx.lineWidth = 2;
    const step = (width - 72) / 10;
    for (let n = 0; n <= 10; n++) {
      const tx = x + 36 + n * step;
      ctx.strokeStyle = '#0B1E3B';
      ctx.beginPath();
      ctx.moveTo(tx, lineY - 12);
      ctx.lineTo(tx, lineY + 12);
      ctx.stroke();
      ctx.fillStyle = '#0B1E3B';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(n), tx, lineY - 22);
    }
    ctx.textAlign = 'left';
  } else if (spec.type === 'figura_geometrica') {
    ctx.fillStyle = '#E6F0FD';
    ctx.strokeStyle = '#0B1E3B';
    ctx.fillRect(x + 80, y + 28, 120, 86);
    ctx.strokeRect(x + 80, y + 28, 120, 86);

    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(x + 370, y + 71, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#DCFCE7';
    ctx.beginPath();
    ctx.moveTo(x + 610, y + 26);
    ctx.lineTo(x + 678, y + 114);
    ctx.lineTo(x + 542, y + 114);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0B1E3B';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(fmt(cards[0]?.label || 'Quadrado'), x + 98, y + 142);
    ctx.fillText(fmt(cards[1]?.label || 'Círculo'), x + 340, y + 142);
    ctx.fillText(fmt(cards[2]?.label || 'Triângulo'), x + 572, y + 142);
  } else {
    const items =
      cards.length >= 2
        ? cards.slice(0, 3)
        : [
            { label: spec.caption ? spec.caption.slice(0, 26) : 'Cartão 1', sublabel: '' },
            { label: 'Cartão 2', sublabel: '' },
          ];
    const cardW = (width - 40 - (items.length - 1) * 18) / items.length;
    items.forEach((card, idx) => {
      const bx = x + 20 + idx * (cardW + 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#2B7DE9';
      ctx.fillRect(bx, y + 26, cardW, 112);
      ctx.strokeRect(bx, y + 26, cardW, 112);
      ctx.strokeStyle = '#0B1E3B';
      ctx.strokeRect(bx + cardW - 32, y + 40, 20, 20);
      ctx.fillStyle = '#0B1E3B';
      ctx.font = 'bold 17px sans-serif';
      wrapCanvasText(ctx, fmt(card.label), bx + 14, y + 58, cardW - 56, 22);
      if (card.sublabel) {
        ctx.fillStyle = '#475569';
        ctx.font = '14px sans-serif';
        wrapCanvasText(ctx, fmt(card.sublabel), bx + 14, y + 102, cardW - 28, 18);
      }
    });
  }

  ctx.fillStyle = '#475569';
  ctx.font = '15px sans-serif';
  ctx.fillText(fmt(`${spec.caption}${spec.sourceCitation ? ` · ${spec.sourceCitation}` : ''}`).slice(0, 110), x + 16, y + boxHeight - 12);
  ctx.restore();
  return y + boxHeight + 20;
}

export async function exportActivityToA4Jpegs(
  activity: PedagogicalActivity,
  includeAnswerKey: boolean
): Promise<void> {
  const W = 1240; // A4 @ 150 DPI
  const H = 1754;
  const M = 84;
  const contentW = W - M * 2;
  const pages: HTMLCanvasElement[] = [];

  const createPage = (pageNumber: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y: number } => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Subtle LumiNext Tech top accent line
    ctx.fillStyle = '#0B1E3B';
    ctx.fillRect(0, 0, W, 14);
    ctx.fillStyle = '#2B7DE9';
    ctx.fillRect(0, 14, W, 5);

    ctx.fillStyle = '#64748B';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(`ApoIA.Edu · LumiNext Tech · Página ${pageNumber}`, M, H - 36);

    pages.push(canvas);
    return { canvas, ctx, y: 74 };
  };

  const downloadPages = (canvasList: HTMLCanvasElement[]) => {
    canvasList.forEach((canvas, idx) => {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ApoIA.Edu_${activity.subject}_Pagina_${idx + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  if (activity.content.worksheetImageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      const pad = 28;
      const availW = W - pad * 2;
      const availH = H - pad * 2;
      const scale = Math.min(availW / img.width, availH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = (W - drawW) / 2;
      const dy = (H - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);

      const outPages: HTMLCanvasElement[] = [canvas];
      const exercises = activity.content.exercises || [];
      if (includeAnswerKey && exercises.length > 0) {
        const keyPage = createPage(2);
        keyPage.ctx.fillStyle = '#0B1E3B';
        keyPage.ctx.font = 'bold 28px Poppins, sans-serif';
        keyPage.y = wrapCanvasText(keyPage.ctx, 'GABARITO SEPARADO (USO DO PROFESSOR)', M, keyPage.y, contentW, 36) + 24;
        for (const ex of exercises) {
          keyPage.ctx.fillStyle = '#0F172A';
          keyPage.ctx.font = '21px Inter, sans-serif';
          keyPage.y = wrapCanvasText(keyPage.ctx, `${ex.number}. ${ex.title}: ${ex.answerKey}`, M, keyPage.y, contentW, 30) + 16;
        }
        outPages.push(keyPage.canvas);
      }
      downloadPages(outPages);
    };
    img.src = activity.content.worksheetImageUrl;
    return;
  }

  const isNonLiterate = activity.literacyStage === 'alfabetizacao_inicial';
  const fmt = (txt: string) => (isNonLiterate ? txt.toUpperCase() : txt);

  let cur = createPage(1);
  let pageCount = 1;

  // Title
  cur.ctx.fillStyle = '#0B1E3B';
  cur.ctx.font = 'bold 30px Poppins, sans-serif';
  cur.y = wrapCanvasText(cur.ctx, fmt(activity.title), M, cur.y, contentW, 38) + 12;

  // School / Teacher / Student / Subject A4 Header Box
  cur.ctx.strokeStyle = '#0B1E3B';
  cur.ctx.lineWidth = 2;
  cur.ctx.strokeRect(M, cur.y, contentW, 110);
  cur.ctx.beginPath();
  cur.ctx.moveTo(M, cur.y + 55);
  cur.ctx.lineTo(M + contentW, cur.y + 55);
  cur.ctx.moveTo(M + contentW / 2, cur.y);
  cur.ctx.lineTo(M + contentW / 2, cur.y + 110);
  cur.ctx.stroke();

  cur.ctx.fillStyle = '#0F172A';
  cur.ctx.font = '20px Inter, sans-serif';
  cur.ctx.fillText(fmt(`Escola: ${activity.content.schoolHeader || '________________'}`), M + 14, cur.y + 34);
  cur.ctx.fillText(fmt(`Componente: ${activity.content.subjectHeader}`), M + contentW / 2 + 14, cur.y + 34);
  cur.ctx.fillText(fmt(`Professor(a): ${activity.content.teacherHeader || '________________'}`), M + 14, cur.y + 88);
  cur.ctx.fillText(fmt(`Aluno(a): ${activity.content.studentHeader}`), M + contentW / 2 + 14, cur.y + 88);
  cur.y += 145;

  if (activity.content.brailleOrLibrasNote) {
    cur.ctx.fillStyle = '#1E293B';
    cur.ctx.font = '18px Inter, sans-serif';
    cur.y = wrapCanvasText(cur.ctx, fmt(`Acessibilidade: ${activity.content.brailleOrLibrasNote}`), M, cur.y, contentW, 26) + 18;
  }

  const exercises = activity.content.exercises || [];
  const preloadedMap = new Map<number, HTMLImageElement | null>();
  await Promise.all(
    exercises.map(async (ex) => {
      if (ex.visualAidSpec?.imageUrl) {
        preloadedMap.set(ex.number, await loadImageAsync(ex.visualAidSpec.imageUrl));
      }
    })
  );

  for (const ex of exercises) {
    if (cur.y > H - 420) {
      pageCount++;
      cur = createPage(pageCount);
    }

    cur.ctx.fillStyle = '#0B1E3B';
    cur.ctx.font = 'bold 24px Poppins, sans-serif';
    cur.y = wrapCanvasText(cur.ctx, fmt(`${ex.number}. ${ex.title}`), M, cur.y, contentW, 32) + 6;

    cur.ctx.fillStyle = '#0F172A';
    cur.ctx.font = '21px Inter, sans-serif';
    cur.y = wrapCanvasText(cur.ctx, fmt(ex.instruction), M, cur.y, contentW, 30) + 12;

    if (ex.visualAidSpec && ex.visualAidSpec.type !== 'nenhum') {
      const preImg = preloadedMap.get(ex.number) || null;
      const neededHeight = preImg ? 400 : 250;
      if (cur.y > H - neededHeight) {
        pageCount++;
        cur = createPage(pageCount);
      }
      cur.y = drawVisualAidOnCanvas(cur.ctx, ex.visualAidSpec, M, cur.y, contentW, isNonLiterate, preImg);
    }

    for (const item of ex.items) {
      cur.ctx.fillStyle = '#1E293B';
      cur.ctx.font = '20px Inter, sans-serif';
      cur.y = wrapCanvasText(cur.ctx, fmt(`• ${item}`), M + 16, cur.y, contentW - 16, 28) + 6;
    }

    for (let l = 0; l < (ex.responseLines || 2); l++) {
      cur.y += 38;
      cur.ctx.strokeStyle = '#94A3B8';
      cur.ctx.lineWidth = 1.5;
      cur.ctx.beginPath();
      cur.ctx.moveTo(M, cur.y);
      cur.ctx.lineTo(M + contentW, cur.y);
      cur.ctx.stroke();
    }
    cur.y += 34;
  }

  if (includeAnswerKey && exercises.length > 0) {
    pageCount++;
    cur = createPage(pageCount);
    cur.ctx.fillStyle = '#0B1E3B';
    cur.ctx.font = 'bold 28px Poppins, sans-serif';
    cur.y = wrapCanvasText(cur.ctx, 'GABARITO SEPARADO (USO DO PROFESSOR)', M, cur.y, contentW, 36) + 24;
    for (const ex of exercises) {
      cur.ctx.fillStyle = '#0F172A';
      cur.ctx.font = '21px Inter, sans-serif';
      cur.y = wrapCanvasText(cur.ctx, `${ex.number}. ${ex.title}: ${ex.answerKey}`, M, cur.y, contentW, 30) + 16;
    }
  }

  pages.forEach((canvas, idx) => {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ApoIA.Edu_${activity.subject}_Pagina_${idx + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}
