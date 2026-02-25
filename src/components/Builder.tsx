"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  RotateCcw,
  Wand2,
  Plus,
  Trash2,
  Sparkles,
  Film,
  Clapperboard,
  ScrollText,
  ArrowRight,
} from "lucide-react";

/**
 * Normalizes newline sequences and prevents huge blank gaps.
 * - Converts CRLF and CR to LF
 * - Collapses 3+ consecutive newlines into 2
 * - Trims leading/trailing whitespace
 */
export function clampLines(text: string): string {
  return text
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Minimal runtime tests (run once). Keeps this self-contained.
(function clampLinesTests() {
  const a = "a\r\n\r\n\r\n\r\n b";
  const r1 = clampLines(a);
  console.assert(
    r1 === "a\n\n b",
    "clampLines should normalize CRLF and collapse newlines"
  );

  const b = "\n\n\nhello\n\n\n\n";
  const r2 = clampLines(b);
  console.assert(
    r2 === "hello",
    "clampLines should trim and collapse large newline runs"
  );

  const c = "x\r\r\r\ny";
  const r3 = clampLines(c);
  console.assert(r3 === "x\n\ny", "clampLines should normalize lone CR too");

  const d = "keep\n\nthis\n\n";
  const r4 = clampLines(d);
  console.assert(
    r4 === "keep\n\nthis",
    "clampLines should preserve double newlines (paragraph breaks)"
  );
})();

type DialogueLine = { id: string; who: string; line: string };

type Lang = "EN" | "PT";

const I18N: Record<Lang, Record<string, string>> = {
  EN: {
    proseHeading: "[PROSE SCENE]",
    cineHeading: "Cinematography:",
    actsHeading: "Actions (beats):",
    perfHeading: "Performance notes:",
    dialHeading: "Dialogue (optional):",

    prosePlaceholder:
      "(Describe exactly what we see: characters + outfit + environment + time of day + weather + concrete visual details.)",

    cameraShotLabel: "Camera shot",
    cameraMotionLabel: "Camera motion",
    dofLabel: "Depth of field",
    lightingLabel: "Lighting + palette",
    onlyOneMove: "(only one movement)",

    beat1Placeholder: "(short visible action + count)",
    beat2Placeholder: "(pause / look / micro-gesture)",
    beat3Placeholder: "(final action on the last second)",

    perf1Placeholder: "(micro-expressions + breathing + rhythm + a small hold)",
    perf2Placeholder: "(eyeline + emotional intention)",

    dialoguePlaceholder: "(Add short lines per character.)",

    simpleHint:
      "Tip: for best results in Sora, English prompts usually work best — but PT mode helps beginners fill the structure.",

    buildBtn: "Generate full prompt",
  },
  PT: {
    proseHeading: "[CENA / PROSA]",
    cineHeading: "Cinematografia:",
    actsHeading: "Ações (beats):",
    perfHeading: "Notas de atuação:",
    dialHeading: "Diálogo (opcional):",

    prosePlaceholder:
      "(Descreva exatamente o que vemos: personagens + figurino + cenário + horário + clima + detalhes visuais concretos.)",

    cameraShotLabel: "Plano de câmera",
    cameraMotionLabel: "Movimento de câmera",
    dofLabel: "Profundidade de campo",
    lightingLabel: "Luz + paleta",
    onlyOneMove: "(apenas 1 movimento)",

    beat1Placeholder: "(ação curta e visível + contagem)",
    beat2Placeholder: "(pausa / olhar / micro gesto)",
    beat3Placeholder: "(ação final no último segundo)",

    perf1Placeholder:
      "(micro-expressões + respiração + ritmo + um pequeno ‘hold’)",
    perf2Placeholder: "(direção do olhar + intenção emocional)",

    dialoguePlaceholder: "(Adicione falas curtas por personagem.)",

    simpleHint:
      "Dica: para Sora, prompts em inglês costumam render melhor — mas o modo PT ajuda iniciantes a preencher a estrutura.",

    buildBtn: "Gerar prompt completo",
  },
};

const DEFAULT_STYLE_LOCK =
  "STYLE LOCK: Pure 2D hand-drawn anime (premium cel shading, crisp clean lineart, sakuga micro-acting, hand-drawn smears, 2D motion blur). NO 3D/CGI. No photorealism.";

const DEFAULT_HARD_RULES =
  "Hard rules:\n- No text/subtitles/UI/watermarks.\n- Keep faces on-model; keep outfit consistent.\n- Avoid 3D shading, volumetric CGI look, plastic skin.";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// =====================
// Story / Script Builder
// =====================

type StoryTone =
  | "Epic adventure"
  | "Sci-fi mystery"
  | "Dark thriller"
  | "Heartfelt drama"
  | "Action comedy";

type StoryInputs = {
  seriesTitle: string;
  logline: string;
  tone: StoryTone;
  rating: "PG" | "PG-13";
  episodesCount: number;
  episodeMinutes: number;
  protagonistName: string;
  protagonistCore: string;
  protagonistWant: string;
  protagonistFear: string;
  antagonistName: string;
  antagonistForce: string;
  worldOneLine: string;
  worldRules: string;
  theme: string;
  setPiece: string;
};

type TakeSpec = {
  id: string;
  label: string;
  duration: "6s" | "8s" | "10s" | "12s" | "15s";
  shot: "wide" | "medium" | "close-up";
  motion: "slow push-in" | "tracking pan" | "orbit micro" | "static lock";
  prose: string;
  beat1: string;
  beat2: string;
  beat3: string;
  perf1: string;
  perf2: string;
  vfx: string;
};

type StoryOutput = {
  bible: string;
  seasonOutline: string;
  ep1Script: string;
  takes: TakeSpec[];
};

function safeLine(s: string, fallback: string) {
  const v = clampLines(s || "");
  return v ? v : fallback;
}

function buildSeasonOutlinePT(i: StoryInputs): string {
  const n = Math.max(
    3,
    Math.min(24, Number.isFinite(i.episodesCount) ? i.episodesCount : 8)
  );
  const title = safeLine(i.seriesTitle, "Série");
  const p = safeLine(i.protagonistName, "Protagonista");
  const ant = safeLine(i.antagonistName, "Força contrária");
  const theme = safeLine(i.theme, "mudança");

  const lines: string[] = [];
  lines.push(`TEMPORADA (${n} eps) — VISÃO GERAL`);
  lines.push(`Pergunta central: ${p} vai conseguir enfrentar ${ant} e provar ${theme}?`);
  lines.push("");

  for (let ep = 1; ep <= n; ep++) {
    const escalation =
      ep === 1
        ? "O mundo vira do avesso e a missão aparece."
        : ep === 2
        ? "Primeira consequência: o inimigo reage e cobra um preço."
        : ep === 3
        ? "Revelação: a regra do mundo tem um custo escondido."
        : ep === Math.ceil(n / 2)
        ? "Virada de meio: verdade maior muda tudo."
        : ep === n - 1
        ? "Tudo dá errado: o plano quebra e o herói quase perde."
        : ep === n
        ? "Final: escolha impossível + clímax + gancho para próxima."
        : "Escalada: pistas, alianças e um perigo maior.";

    const hook =
      ep === 1
        ? "Gancho: um sinal no céu aponta para algo vivo."
        : ep === 2
        ? "Gancho: uma mensagem/interferência revela um nome proibido."
        : ep === 3
        ? "Gancho: alguém próximo trai (ou parece trair)."
        : ep === Math.ceil(n / 2)
        ? "Gancho: o verdadeiro objetivo do inimigo aparece."
        : ep === n - 1
        ? "Gancho: o relógio zera — sem volta."
        : ep === n
        ? "Gancho: um novo chamado abre o próximo arco."
        : "Gancho: uma pista muda a rota.";

    lines.push(`EP${String(ep).padStart(2, "0")}: ${title} — ${escalation} ${hook}`);
  }

  return clampLines(lines.join("\n"));
}

function buildEpisode1PT(i: StoryInputs): { script: string; takes: TakeSpec[] } {
  const title = safeLine(i.seriesTitle, "Série");
  const logline = safeLine(i.logline, "Uma história poderosa começa.");
  const tone = i.tone;
  const rating = i.rating;
  const mins = Math.max(
    6,
    Math.min(30, Number.isFinite(i.episodeMinutes) ? i.episodeMinutes : 12)
  );

  const p = safeLine(i.protagonistName, "Protagonista");
  const pCore = safeLine(i.protagonistCore, "um coração teimoso e um olhar atento");
  const pWant = safeLine(i.protagonistWant, "pertencer a algum lugar");
  const pFear = safeLine(i.protagonistFear, "não ser suficiente");

  const ant = safeLine(i.antagonistName, "A Força");
  const antForce = safeLine(i.antagonistForce, "uma presença que controla sinais e destinos");

  const world = safeLine(i.worldOneLine, "uma cidade sob chuva e luzes");
  const rules = safeLine(i.worldRules, "Regras: energia tem preço; promessa vira dívida; e o céu responde.");
  const theme = safeLine(i.theme, "coragem");
  const setPiece = safeLine(i.setPiece, "chuva de meteoros sobre a cidade");

  const beats = {
    hook: "GANCHO (0–30s): imagem icônica + perigo imediato + pergunta no ar.",
    inciting: "INCITING INCIDENT: o evento que quebra a rotina e obriga a agir.",
    midpoint: "VIRADA DO MEIO: uma verdade muda o sentido da missão.",
    allIsLost: "TUDO DÁ ERRADO: custo emocional/real — quase derrota.",
    climax: "CLÍMAX: escolha difícil + ação + consequência.",
    cliff: "CLIFFHANGER: resposta parcial + nova ameaça.",
  };

  const sceneCount = mins <= 10 ? 7 : mins <= 15 ? 9 : 11;

  const sceneTemplates: Array<
    () => {
      title: string;
      goal: string;
      obstacle: string;
      turn: string;
      visuals: string;
      acting: string;
    }
  > = [
    () => ({
      title: `CENA 1 — CHUVA, RACHADURA NO CÉU (COLD OPEN)`,
      goal: `${p} tenta atravessar o cotidiano sem chamar atenção.`,
      obstacle: `O céu começa a "falhar": luzes piscam, vento muda, sinais interferem.`,
      turn: `Primeiro meteoro cai perto demais — algo dentro dele parece olhar de volta.`,
      visuals: `Noite chuvosa, reflexos no asfalto, néon tremendo, trovões recortando silhuetas.`,
      acting: `Micro-acting: respiração curta, olhar preso no céu, mãos tremem mas controlam.`,
    }),
    () => ({
      title: `CENA 2 — O IMPACTO E O CHAMADO`,
      goal: `${p} tenta salvar alguém/evitar o caos sem se expor.`,
      obstacle: `O meteoro "abre" um rastro de energia e atrai atenção (câmeras/drones/pessoas).`,
      turn: `A energia marca ${p} — um símbolo/ritmo aparece (sem texto).`,
      visuals: `Fumaça molhada, faíscas, partículas como poeira estelar, pingos que viram brilho.`,
      acting: `Olhos reconhecem o impossível; decisão nasce no rosto: "eu não vou fugir".`,
    }),
    () => ({
      title: `CENA 3 — REGRA DO MUNDO (EXPLICAÇÃO SEM EXPLAIN)`,
      goal: `${p} busca entender o que aconteceu.`,
      obstacle: `Toda tentativa de explicar vira ruído: rádio chia, telas glitcham, memória falha.`,
      turn: `Uma pista concreta: um objeto/relíquia reage quando ${p} toca.`,
      visuals: `Interior simples, luz fria, chuva na janela, sombras de relâmpago marcando paredes.`,
      acting: `Foco e medo ao mesmo tempo; micro pausa antes de encostar no objeto.`,
    }),
    () => ({
      title: `CENA 4 — PRIMEIRO CONFRONTO COM ${ant.toUpperCase()}`,
      goal: `${p} tenta escapar/ocultar a marca.`,
      obstacle: `${ant} age por ${antForce}: sinais, sirenes, olhos no escuro.`,
      turn: `${p} usa instinto (não poder total) e sobrevive por pouco.`,
      visuals: `Rua estreita, chuva forte, luzes estourando, sombra gigantesca atravessa a fachada.`,
      acting: `Corpo em tensão, mandíbula travada; olhar calcula rota; respira e corre.`,
    }),
    () => ({
      title: `CENA 5 — ALIANÇA (OU MENTIRA)`,
      goal: `${p} encontra alguém que parece ajudar (mentor/aliado).`,
      obstacle: `Essa pessoa sabe demais — e exige escolha.`,
      turn: `Revelação parcial: "você é guardiã(o)" — mas o preço ainda é segredo.`,
      visuals: `Abrigo improvisado, luz quente de emergência, pingos escorrendo em metal.`,
      acting: `Olhar desconfiado → pequena abertura → medo volta quando a palavra pesa.`,
    }),
    () => ({
      title: `CENA 6 — VELHO DESEJO, NOVA RESPONSABILIDADE`,
      goal: `${p} tenta manter ${pWant} vivo mesmo com a missão.`,
      obstacle: `O medo ${pFear} explode: "eu vou falhar".`,
      turn: `${p} escolhe agir mesmo tremendo — tema: ${theme}.`,
      visuals: `Close em detalhes: água pingando, luz no olho, tecido colado, fumaça longe.`,
      acting: `Micro-acting forte: engole seco, segura o choro, respira e firma o olhar.`,
    }),
    () => ({
      title: `CENA 7 — SET PIECE: ${setPiece.toUpperCase()}`,
      goal: `${p} tenta impedir um desastre em escala (sem dominar tudo).`,
      obstacle: `${ant} distorce a realidade local: objetos "quebram" em pixels, som falha.`,
      turn: `Um gesto específico de ${p} estabiliza 1 coisa — prova de potencial.`,
      visuals: `Cidade viva: fogo, fumaça em camadas, chuva cortada por vento, céu em tempestade.`,
      acting: `Decisão no último segundo; micro sorriso de coragem/medo misturado.`,
    }),
    () => ({
      title: `CENA 8 — TUDO DÁ ERRADO (CUSTO)`,
      goal: `${p} tenta proteger alguém/um lugar.`,
      obstacle: `O preço vem: perda, culpa, consequência imediata.`,
      turn: `${p} quase desiste — mas uma pista abre a próxima ação.`,
      visuals: `Silêncio após o caos: fumaça baixa, sirene distante, chuva fina, luz pulsando.`,
      acting: `Olhar vazio por 1 segundo; respira fundo; volta a existir.`,
    }),
    () => ({
      title: `CENA 9 — CLIFFHANGER (CHAMADO MAIOR)`,
      goal: `${p} tenta entender o que é ser guardiã(o).`,
      obstacle: `A resposta vem incompleta.`,
      turn: `Gancho: um sinal no céu forma um mapa/constelação que aponta para algo vivo.`,
      visuals: `WIDE do céu: relâmpago revela um desenho impossível; reflexo em poça tremendo.`,
      acting: `Micro-acting: medo vira fascínio; queixo levanta; lágrima segura.`,
    }),
  ];

  const scenes = Array.from({ length: sceneCount }, (_, idx) =>
    sceneTemplates[idx] ? sceneTemplates[idx]() : sceneTemplates[sceneTemplates.length - 1]()
  );

  const lines: string[] = [];
  lines.push(`${title} — EPISÓDIO 1 (Plano Starter)`);
  lines.push(`${tone} • ${rating} • ~${mins} min`);
  lines.push("");
  lines.push("LOGLINE:");
  lines.push(logline);
  lines.push("");
  lines.push("MUNDO (1 linha):");
  lines.push(world);
  lines.push("REGRAS:");
  lines.push(rules);
  lines.push("");
  lines.push("PERSONAGEM PRINCIPAL:");
  lines.push(`${p}: ${pCore}.`);
  lines.push(`Quer: ${pWant}.`);
  lines.push(`Tem medo de: ${pFear}.`);
  lines.push("");
  lines.push("FORÇA CONTRÁRIA:");
  lines.push(`${ant}: ${antForce}.`);
  lines.push("");
  lines.push("ESTRUTURA DRAMÁTICA:");
  lines.push(`- ${beats.hook}`);
  lines.push(`- ${beats.inciting}`);
  lines.push(`- ${beats.midpoint}`);
  lines.push(`- ${beats.allIsLost}`);
  lines.push(`- ${beats.climax}`);
  lines.push(`- ${beats.cliff}`);
  lines.push("");
  lines.push("ROTEIRO EM CENAS (com objetivo, obstáculo, mudança):");

  const approxSceneMin = Math.max(0.8, mins / sceneCount);
  scenes.forEach((s, idx) => {
    const start = (idx * approxSceneMin).toFixed(1);
    const end = ((idx + 1) * approxSceneMin).toFixed(1);
    lines.push("");
    lines.push(`${s.title}  [~${start}–${end} min]`);
    lines.push(`Objetivo: ${s.goal}`);
    lines.push(`Obstáculo: ${s.obstacle}`);
    lines.push(`Mudança: ${s.turn}`);
    lines.push(`Visuais: ${s.visuals}`);
    lines.push(`Atuação: ${s.acting}`);
  });

  lines.push("");
  lines.push("FECHAMENTO DO EP1:");
  lines.push(
    `Cliffhanger: ${p} olha para o céu — a constelação responde. A missão começa de verdade.`
  );

  const takes: TakeSpec[] = [];
  const durations: TakeSpec["duration"][] = ["8s", "10s", "12s", "10s", "8s", "10s", "12s", "10s"];

  const sceneToTakes = (sceneIdx: number) => {
    const base = sceneIdx * 3;
    const s = scenes[sceneIdx];
    const baseLabel = `C${sceneIdx + 1}`;

    const t1: TakeSpec = {
      id: uid("take"),
      label: `TAKE ${String(base + 1).padStart(2, "0")} (${baseLabel}) — Establish / mood`,
      duration: durations[sceneIdx % durations.length],
      shot: "wide",
      motion: "tracking pan",
      prose: clampLines(
        `${s.title}. ${s.visuals} Mostre a escala e o clima. ${p} entra no quadro com intenção clara.`
      ),
      beat1: `0:00–0:03: Estabelece o espaço e o perigo (clima em movimento, nada estático).`,
      beat2: `0:03–0:06: Micro-hold no rosto de ${p} reagindo (respiração + olhar).`,
      beat3: `0:06–end: Um detalhe muda (relâmpago / glitch / meteoro) e corta seco.`,
      perf1: `Micro-expressões realistas; tensão na mandíbula; respiração audível.`,
      perf2: `Eyeline motivado (céu / ameaça / aliado). Não exagerar.`,
      vfx: "Chuva, reflexos, fumaça em camadas, relâmpagos desenhados; se houver pixels, dissolução limpa.",
    };

    const t2: TakeSpec = {
      id: uid("take"),
      label: `TAKE ${String(base + 2).padStart(2, "0")} (${baseLabel}) — Acting beat`,
      duration: "10s",
      shot: "close-up",
      motion: "slow push-in",
      prose: clampLines(
        `Close no rosto/mãos de ${p}. ${s.acting} Detalhes visuais concretos (água no cabelo, tecido, reflexo).`
      ),
      beat1: `0:00–0:04: Push-in lento; ${p} segura a emoção; olhos acompanham algo fora.`,
      beat2: `0:04–0:07: Pausa de 0.4s (micro-acting), depois decisão aparece no rosto.`,
      beat3: `0:07–end: Pequena ação (mão toca objeto / dá 1 passo) = mudança.`,
      perf1: `Respiração muda no meio; piscada rara; tensão sobe e desce.`,
      perf2: `Intenção: ${theme}. O medo existe, mas não domina.`,
      vfx: "Faíscas sutis, glitch outline leve, gotas estourando em highlights.",
    };

    const t3: TakeSpec = {
      id: uid("take"),
      label: `TAKE ${String(base + 3).padStart(2, "0")} (${baseLabel}) — Action / turn`,
      duration: "12s",
      shot: "medium",
      motion: "orbit micro",
      prose: clampLines(
        `${s.turn} Mostre ação clara e legível. Parallax leve com um elemento no primeiro plano (poste, antena, vidro).`
      ),
      beat1: `0:00–0:04: A ação começa (movimento simples, leitura clara).`,
      beat2: `0:04–0:08: Impacto (2–3 impact frames desenhados, sem look 3D).`,
      beat3: `0:08–end: Consequência visível (pixel dissolve / luz estoura / silêncio) + hard cut.`,
      perf1: `Corpo reage ao impacto: ombro, pescoço, foco do olhar.`,
      perf2: `Não virar "clipe" — é narrativa: começo/meio/fim.`,
      vfx: "Glitch outline, pixel desintegração limpa, fumaça desenhada e fogo sempre em movimento.",
    };

    return [t1, t2, t3];
  };

  for (let si = 0; si < scenes.length; si++) {
    takes.push(...sceneToTakes(si));
  }

  takes.push({
    id: uid("take"),
    label: `TAKE ${String(takes.length + 1).padStart(2, "0")} (FINAL) — Cliffhanger sky map`,
    duration: "10s",
    shot: "wide",
    motion: "static lock",
    prose: clampLines(
      `WIDE do céu. Relâmpago revela uma constelação impossível apontando um destino. Reflexo em poça treme. ${p} em silhueta.`
    ),
    beat1: "0:00–0:04: Céu vivo (nuvens, relâmpagos desenhados).",
    beat2: "0:04–0:07: Micro-hold no olhar de silhueta de personagem (fascínio + medo).",
    beat3: "0:07–end: A constelação 'encaixa' como mapa e corta seco.",
    perf1: "0 exagero. Um único gesto: queixo levanta. Respiração segura.",
    perf2: "Eyeline fixo no céu; emoção contida.",
    vfx: "Tempestade, brilho, partículas finas; sem volumetric CGI.",
  });

  (function storyBuilderTests() {
    const s = lines.join("\n");
    console.assert(s.includes("ROTEIRO EM CENAS"), "EP1 script should include scenes section");
    console.assert(s.includes("CLIFFHANGER"), "EP1 script should include cliffhanger");
    console.assert(takes.length >= sceneCount * 3, "Takes should be generated per scene");
  })();

  return { script: clampLines(lines.join("\n")), takes };
}

function buildStoryOutput(i: StoryInputs, lang: Lang): StoryOutput {
  if (lang === "EN") {
    const pt = buildStoryOutput(i, "PT");
    const bible =
      "SERIES BIBLE (quick)\n" +
      pt.bible
        .replace(/\bSÉRIE\b/g, "SERIES")
        .replace(/\bTEMPORADA\b/g, "SEASON")
        .replace(/\bEPISÓDIO\b/g, "EPISODE")
        .replace(/\bMUNDO\b/g, "WORLD")
        .replace(/\bREGRAS\b/g, "RULES");
    return { ...pt, bible: clampLines(bible) };
  }

  const title = safeLine(i.seriesTitle, "Série");
  const logline = safeLine(i.logline, "Uma história poderosa começa.");
  const p = safeLine(i.protagonistName, "Protagonista");
  const ant = safeLine(i.antagonistName, "Força contrária");
  const theme = safeLine(i.theme, "coragem");

  const bibleLines: string[] = [];
  bibleLines.push(`BÍBLIA RÁPIDA — ${title}`);
  bibleLines.push("");
  bibleLines.push("PREMISSA (1 frase):");
  bibleLines.push(logline);
  bibleLines.push("");
  bibleLines.push("TOM:");
  bibleLines.push(i.tone);
  bibleLines.push("");
  bibleLines.push("TEMA:");
  bibleLines.push(theme);
  bibleLines.push("");
  bibleLines.push("PERSONAGEM PRINCIPAL:");
  bibleLines.push(`${p} — ${safeLine(i.protagonistCore, "um coração teimoso")}`);
  bibleLines.push(`Quer: ${safeLine(i.protagonistWant, "pertencer")}`);
  bibleLines.push(`Medo: ${safeLine(i.protagonistFear, "falhar")}`);
  bibleLines.push("");
  bibleLines.push("FORÇA CONTRÁRIA:");
  bibleLines.push(`${ant} — ${safeLine(i.antagonistForce, "uma presença que distorce sinais")}`);
  bibleLines.push("");
  bibleLines.push("MUNDO (1 linha):");
  bibleLines.push(safeLine(i.worldOneLine, "uma cidade sob chuva e luzes"));
  bibleLines.push("");
  bibleLines.push("REGRAS DO MUNDO:");
  bibleLines.push(safeLine(i.worldRules, "Energia tem preço. Promessa vira dívida. O céu responde."));
  bibleLines.push("");
  bibleLines.push("GANCHO DA TEMPORADA:");
  bibleLines.push(
    `Quando ${p} é marcado(a) por um evento cósmico, precisa enfrentar ${ant} e provar ${theme} — antes que o céu "apague" a cidade.`
  );

  const seasonOutline = buildSeasonOutlinePT(i);
  const ep1 = buildEpisode1PT(i);

  return {
    bible: clampLines(bibleLines.join("\n")),
    seasonOutline,
    ep1Script: ep1.script,
    takes: ep1.takes,
  };
}

function takeToPromptText(t: TakeSpec, lang: Lang): string {
  const header = `${t.label}`;
  const format = "FORMAT: 4K • 24fps • 9:16 • " + t.duration + " • PG-13.";
  const proseHeading = lang === "PT" ? "[CENA / PROSA]" : "[PROSE SCENE]";
  const cineHeading = lang === "PT" ? "Cinematografia:" : "Cinematography:";
  const actsHeading = lang === "PT" ? "Ações (beats):" : "Actions (beats):";
  const perfHeading = lang === "PT" ? "Notas de atuação:" : "Performance notes:";
  const vfxHeading = lang === "PT" ? "VFX / Atmosfera:" : "VFX / Atmosphere:";

  const cine =
    `${cineHeading}\n` +
    `${lang === "PT" ? "Plano" : "Shot"}: ${t.shot}\n` +
    `${lang === "PT" ? "Movimento" : "Motion"}: ${t.motion} (only one movement)`;

  const acts = `${actsHeading}\n- Beat 1: ${t.beat1}\n- Beat 2: ${t.beat2}\n- Beat 3: ${t.beat3}`;
  const perf = `${perfHeading}\n- ${t.perf1}\n- ${t.perf2}`;
  const vfx = `${vfxHeading}\n${t.vfx}`;

  return clampLines(
    [
      "Loko-Motion-Style.",
      DEFAULT_STYLE_LOCK,
      format,
      header,
      `${proseHeading}\n${t.prose}`,
      cine,
      acts,
      perf,
      vfx,
      DEFAULT_HARD_RULES,
    ].join("\n\n")
  );
}

export default function LokoMotionApp() {
  // ALWAYS default to Story tab for first open
  const [mainTab, setMainTab] = useState<"story" | "prompt">("story");

  // If user shares a link with #prompt or #story, honor it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = (window.location.hash || "").replace("#", "").trim();
    if (h === "story" || h === "prompt") setMainTab(h);
  }, []);

  const [language, setLanguage] = useState<Lang>("PT");
  const t = useMemo(() => I18N[language], [language]);

  // Prompt Builder
  const [styleLock, setStyleLock] = useState(DEFAULT_STYLE_LOCK);
  const [hardRules, setHardRules] = useState(DEFAULT_HARD_RULES);
  const [includeFormat, setIncludeFormat] = useState(true);
  const [formatLine, setFormatLine] = useState(
    "FORMAT: 4K • 24fps • 9:16 • 10s • PG-13."
  );
  const [proseScene, setProseScene] = useState("");

  const [shot, setShot] = useState<"wide" | "medium" | "close-up">("wide");
  const [angle, setAngle] = useState("");
  const [distance, setDistance] = useState("");
  const [motion, setMotion] = useState<
    "slow push-in" | "handheld subtle" | "orbit micro" | "static lock" | "tracking pan"
  >("slow push-in");
  const [dof, setDof] = useState<"shallow" | "deep" | "">("");
  const [lightingPalette, setLightingPalette] = useState("");

  const [beat1, setBeat1] = useState("");
  const [beat2, setBeat2] = useState("");
  const [beat3, setBeat3] = useState("");

  const [perf1, setPerf1] = useState("");
  const [perf2, setPerf2] = useState("");

  const [includeDialogue, setIncludeDialogue] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([
    { id: "d1", who: "Personagem A", line: "" },
    { id: "d2", who: "Personagem B", line: "" },
  ]);

  // Simple Prompt Builder
  const [simpleDescription, setSimpleDescription] = useState("");
  const [simpleCharacters, setSimpleCharacters] = useState("");
  const [simpleOutfit, setSimpleOutfit] = useState("");
  const [simplePlace, setSimplePlace] = useState<
    | "rooftop"
    | "penthouse"
    | "street"
    | "alley"
    | "lab"
    | "city skyline"
    | "interior room"
  >("penthouse");
  const [simpleTime, setSimpleTime] = useState<"dawn" | "day" | "sunset" | "night">(
    "night"
  );
  const [simpleWeather, setSimpleWeather] = useState<
    "clear" | "rain" | "storm" | "fog" | "windy"
  >("storm");
  const [simpleMood, setSimpleMood] = useState<
    "epic" | "tense" | "intimate" | "mysterious" | "horror"
  >("tense");
  const [simplePace, setSimplePace] = useState<"slow" | "medium" | "fast">("medium");

  const [fxGlitch, setFxGlitch] = useState(true);
  const [fxPixels, setFxPixels] = useState(false);
  const [fxFireSmoke, setFxFireSmoke] = useState(true);
  const [fxLightning, setFxLightning] = useState(true);
  const [fxRainStreaks, setFxRainStreaks] = useState(true);
  const [fxEmbers, setFxEmbers] = useState(true);

  const [simpleShot, setSimpleShot] = useState<"wide" | "medium" | "close-up">("medium");
  const [simpleMotion, setSimpleMotion] = useState<
    "slow push-in" | "tracking pan" | "orbit micro" | "static lock" | "handheld subtle"
  >("slow push-in");
  const [simpleAngle, setSimpleAngle] = useState<"low angle" | "eye-level" | "high angle" | "">(
    "low angle"
  );

  const [simpleRatio, setSimpleRatio] = useState<"9:16" | "16:9">("9:16");
  const [simpleDuration, setSimpleDuration] = useState<"5s" | "10s" | "15s">("10s");
  const [simpleRating, setSimpleRating] = useState<"PG" | "PG-13">("PG-13");

  // Story Builder
  const [storyInputs, setStoryInputs] = useState<StoryInputs>({
    seriesTitle: "",
    logline:
      "Quero uma história de uma menina que cai na Terra durante uma chuva de meteoros e descobre que é guardiã das galáxias.",
    tone: "Epic adventure",
    rating: "PG-13",
    episodesCount: 8,
    episodeMinutes: 12,
    protagonistName: "",
    protagonistCore: "curiosa, corajosa, e com uma tristeza escondida",
    protagonistWant: "ser aceita e encontrar seu lugar",
    protagonistFear: "não conseguir salvar ninguém",
    antagonistName: "",
    antagonistForce: "uma inteligência antiga que caça sinais cósmicos e apaga memórias",
    worldOneLine: "Uma cidade grande em tempestade constante, onde o céu parece vivo.",
    worldRules:
      "Energia cósmica deixa rastros; tecnologia reage a emoções; e cada uso tem um custo.",
    theme: "coragem mesmo com medo",
    setPiece: "chuva de meteoros + prédios dissolvendo em pixels quando a força passa perto",
  });

  const [storyOut, setStoryOut] = useState<StoryOutput | null>(null);
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [copiedStory, setCopiedStory] = useState<string | null>(null);

  const prompt = useMemo(() => {
    const blocks: string[] = [];
    blocks.push("Loko-Motion-Style.");

    const sl = clampLines(styleLock);
    const fl = clampLines(formatLine);
    const ps = clampLines(proseScene);
    const lp = clampLines(lightingPalette);
    const hr = clampLines(hardRules);

    if (sl) blocks.push(sl);
    if (includeFormat && fl) blocks.push(fl);

    blocks.push(`${t.proseHeading}\n${ps || t.prosePlaceholder}`);

    const cineLines: string[] = [];
    cineLines.push(
      `${t.cameraShotLabel}: ${shot}${angle ? ", " + angle : ""}${distance ? ", " + distance : ""}`
    );
    cineLines.push(`${t.cameraMotionLabel}: ${motion} ${t.onlyOneMove}`);
    if (dof) cineLines.push(`${t.dofLabel}: ${dof}`);
    if (lp) cineLines.push(`${t.lightingLabel}: ${lp}`);

    blocks.push(`${t.cineHeading}\n${cineLines.join("\n")}`);

    const beatsList: string[] = [];
    beatsList.push(`- Beat 1: ${beat1 || t.beat1Placeholder}`);
    beatsList.push(`- Beat 2: ${beat2 || t.beat2Placeholder}`);
    beatsList.push(`- Beat 3: ${beat3 || t.beat3Placeholder}`);
    blocks.push(`${t.actsHeading}\n${beatsList.join("\n")}`);

    const perf: string[] = [];
    perf.push(`- ${perf1 || t.perf1Placeholder}`);
    perf.push(`- ${perf2 || t.perf2Placeholder}`);
    blocks.push(`${t.perfHeading}\n${perf.join("\n")}`);

    if (includeDialogue) {
      const lines = dialogue
        .map((d) => {
          const who = (d.who || "Personagem").trim() || "Personagem";
          const line = (d.line || "").trim();
          return line ? `- ${who}: "${line}"` : null;
        })
        .filter(Boolean) as string[];

      blocks.push(
        `${t.dialHeading}\n${lines.length ? lines.join("\n") : t.dialoguePlaceholder}`
      );
    }

    if (hr) blocks.push(hr);

    return blocks.join("\n\n").trim() + "\n";
  }, [
    t,
    styleLock,
    includeFormat,
    formatLine,
    proseScene,
    shot,
    angle,
    distance,
    motion,
    dof,
    lightingPalette,
    beat1,
    beat2,
    beat3,
    perf1,
    perf2,
    includeDialogue,
    dialogue,
    hardRules,
  ]);

  async function copyText(text: string, key?: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    if (key === "prompt") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } else {
      setCopiedStory(key || "copied");
      setTimeout(() => setCopiedStory(null), 1200);
    }
  }

  function resetAll() {
    setLanguage("PT");
    setMainTab("story");

    setStyleLock(DEFAULT_STYLE_LOCK);
    setHardRules(DEFAULT_HARD_RULES);
    setIncludeFormat(true);
    setFormatLine("FORMAT: 4K • 24fps • 9:16 • 10s • PG-13.");

    setProseScene("");
    setShot("wide");
    setAngle("");
    setDistance("");
    setMotion("slow push-in");
    setDof("");
    setLightingPalette("");
    setBeat1("");
    setBeat2("");
    setBeat3("");
    setPerf1("");
    setPerf2("");
    setIncludeDialogue(false);
    setDialogue([
      { id: "d1", who: "Personagem A", line: "" },
      { id: "d2", who: "Personagem B", line: "" },
    ]);

    setSimpleDescription("");
    setSimpleCharacters("");
    setSimpleOutfit("");
    setSimplePlace("penthouse");
    setSimpleTime("night");
    setSimpleWeather("storm");
    setSimpleMood("tense");
    setSimplePace("medium");
    setFxGlitch(true);
    setFxPixels(false);
    setFxFireSmoke(true);
    setFxLightning(true);
    setFxRainStreaks(true);
    setFxEmbers(true);
    setSimpleShot("medium");
    setSimpleMotion("slow push-in");
    setSimpleAngle("low angle");
    setSimpleRatio("9:16");
    setSimpleDuration("10s");
    setSimpleRating("PG-13");

    setStoryOut(null);
    setSelectedTakeId(null);
    setStoryInputs((prev) => ({ ...prev, seriesTitle: "", protagonistName: "", antagonistName: "" }));
  }

  function addDialogueLine() {
    setDialogue((prev) => [...prev, { id: uid("d"), who: "Personagem", line: "" }]);
  }

  function removeDialogueLine(id: string) {
    setDialogue((prev) => prev.filter((d) => d.id !== id));
  }

  function autoBuildFromSimple() {
    setFormatLine(`FORMAT: 4K • 24fps • ${simpleRatio} • ${simpleDuration} • ${simpleRating}.`);

    setShot(simpleShot);
    setMotion(simpleMotion as any);
    setAngle(simpleAngle);
    setDistance(
      simpleShot === "wide" ? "city-scale distance" : simpleShot === "close-up" ? "tight framing" : "mid framing"
    );

    const weatherLight =
      simpleWeather === "storm"
        ? "lightning-blue flashes"
        : simpleWeather === "rain"
        ? "wet reflections and soft streetlight"
        : simpleWeather === "fog"
        ? "diffused haze lighting"
        : simpleWeather === "windy"
        ? "hard rim light with drifting debris"
        : "clean key light";

    const moodPalette =
      simpleMood === "epic"
        ? "fire-orange + deep smoke-gray + electric cyan accents"
        : simpleMood === "horror"
        ? "cold blue shadows + sharp red rim"
        : simpleMood === "intimate"
        ? "warm practicals + soft rim"
        : simpleMood === "mysterious"
        ? "neon magenta/cyan with deep blacks"
        : "high-contrast key + rim";

    const fxBits = [
      fxLightning ? "lightning silhouettes" : null,
      fxFireSmoke ? "always-moving fire and smoke" : null,
      fxRainStreaks ? "diagonal rain streaks" : null,
      fxEmbers ? "embers drifting" : null,
      fxGlitch ? "subtle glitch shimmer accents" : null,
      fxPixels ? "pixel-disintegration effect" : null,
    ].filter(Boolean) as string[];

    setLightingPalette(`${weatherLight}; ${moodPalette}; ${fxBits.join(", ")}.`);

    const placeText =
      simplePlace === "penthouse"
        ? "inside a luxury penthouse, at a tall glass window"
        : simplePlace === "rooftop"
        ? "on a rooftop overlooking the city"
        : simplePlace === "street"
        ? "on a street between tall buildings"
        : simplePlace === "alley"
        ? "in a narrow alley with neon reflections"
        : simplePlace === "lab"
        ? "inside a lab with flickering monitors"
        : simplePlace === "city skyline"
        ? "with a full skyline view"
        : "inside a room";

    const timeText =
      simpleTime === "night"
        ? "at night"
        : simpleTime === "sunset"
        ? "at sunset"
        : simpleTime === "dawn"
        ? "at dawn"
        : "in daylight";

    const weatherText =
      simpleWeather === "storm"
        ? "violent thunderstorm"
        : simpleWeather === "rain"
        ? "heavy rain"
        : simpleWeather === "fog"
        ? "thick fog"
        : simpleWeather === "windy"
        ? "strong wind"
        : "clear air";

    const charLine = simpleCharacters.trim() ? `Characters: ${simpleCharacters.trim()}.` : "";
    const outfitLine = simpleOutfit.trim() ? `Outfit details: ${simpleOutfit.trim()}.` : "";
    const fxLine = fxBits.length ? `Environmental motion: ${fxBits.join(", ")}.` : "Environmental motion stays active; nothing is static.";

    const coreDesc = clampLines(simpleDescription) || "Describe the scene in 1–3 simple sentences.";

    setProseScene(
      clampLines(
        `${coreDesc}\n${charLine}${outfitLine ? "\n" + outfitLine : ""}\nSetting: ${placeText}, ${timeText}, ${weatherText}.\nVisual details: wet glass reflections, drifting smoke layers, flickering firelight, moving clouds. ${fxLine}`
      )
    );

    const paceHint = simplePace === "slow" ? "slow and controlled" : simplePace === "fast" ? "fast, punchy" : "steady";

    setBeat1(
      simpleShot === "close-up"
        ? `0:00–0:03 (${paceHint}): Close-up on the character; a small micro-move (finger tightens on glass or cup).`
        : `0:00–0:03 (${paceHint}): Establish the space; camera commits to one clean move (${simpleMotion}).`
    );
    setBeat2("0:03–0:07: Half-second hold for micro-acting; eyes track something outside; breath changes.");
    setBeat3(
      fxPixels
        ? "0:07–end: A key event hits; nearby structure starts pixel-disintegrating in a clean stylized way; hard cut."
        : "0:07–end: A key event hits; lighting spikes (fire or lightning); finish on a strong silhouette; hard cut."
    );

    const moodActing =
      simpleMood === "horror"
        ? "predatory calm, minimal blinking, controlled breath"
        : simpleMood === "intimate"
        ? "soft breath, subtle hesitation, warm eye focus"
        : simpleMood === "epic"
        ? "commanding presence, steady posture, eyes locked"
        : simpleMood === "mysterious"
        ? "contained emotion, slight smirk, eyes half-hidden"
        : "tension held in jaw and shoulders";

    setPerf1(`${moodActing}; add a 0.3–0.5s hold on the strongest emotion.`);
    setPerf2("Eyeline is motivated (looking at the city / threat). Micro facial shifts only; keep it realistic.");

    setHardRules(
      clampLines(
        `${DEFAULT_HARD_RULES}\n- Keep environmental motion continuous (fire/smoke/clouds).\n- If using pixel breakup: clean digital disintegration, no messy rubble simulation.`
      )
    );
  }

  function applyTakeToPromptBuilder(take: TakeSpec) {
    setMainTab("prompt");
    setIncludeFormat(true);
    setFormatLine(`FORMAT: 4K • 24fps • 9:16 • ${take.duration} • PG-13.`);
    setShot(take.shot);
    setMotion(take.motion as any);
    setAngle("");
    setDistance("");
    setDof("");
    setLightingPalette("");
    setProseScene(take.prose);
    setBeat1(take.beat1);
    setBeat2(take.beat2);
    setBeat3(take.beat3);
    setPerf1(take.perf1);
    setPerf2(take.perf2);
    setSelectedTakeId(take.id);

    if (typeof window !== "undefined") window.location.hash = "#prompt";
  }

  function generateStoryEP1() {
    const out = buildStoryOutput(storyInputs, language);
    setStoryOut(out);
    setSelectedTakeId(null);
    if (typeof window !== "undefined") window.location.hash = "#story";
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-zinc-50 to-white p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Loko Motion — AI Director Prompt Builder
              </h1>
              <Badge className="rounded-full">Plano Starter • EP1</Badge>
              <Badge variant="secondary" className="rounded-full">
                R$ 19,90/mês
              </Badge>
              <Badge variant="outline" className="rounded-full">
                v2
              </Badge>
            </div>
            <p className="text-sm text-zinc-600">
              Plano Starter: gere o Episódio 1 (roteiro + take list) e transforme cada take em prompt pronto para o Sora.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zinc-600">Idioma</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Lang)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PT">PT-BR</SelectItem>
                  <SelectItem value="EN">EN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={resetAll} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>

            <Button onClick={() => copyText(prompt, "prompt")} className="gap-2">
              <Copy className="h-4 w-4" /> {copied ? "Copiado!" : "Copiar prompt"}
            </Button>
          </div>
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="story" className="gap-2">
              <ScrollText className="h-4 w-4" /> Roteiro Builder (EP1)
            </TabsTrigger>
            <TabsTrigger value="prompt" className="gap-2">
              <Clapperboard className="h-4 w-4" /> Sora Prompt Builder
            </TabsTrigger>
          </TabsList>

          {/* ===================== STORY BUILDER ===================== */}
          <TabsContent value="story" className="mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5" /> Inputs leigos
                  </CardTitle>
                  <CardDescription>
                    Plano Starter (R$ 19,90): gera EPISÓDIO 1 completo + tabela de takes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome da série</Label>
                      <Input
                        value={storyInputs.seriesTitle}
                        onChange={(e) =>
                          setStoryInputs((p) => ({ ...p, seriesTitle: e.target.value }))
                        }
                        placeholder="Ex: Guardiã das Galáxias"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tom</Label>
                      <Select
                        value={storyInputs.tone}
                        onValueChange={(v) =>
                          setStoryInputs((p) => ({ ...p, tone: v as StoryTone }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Epic adventure">Epic adventure</SelectItem>
                          <SelectItem value="Sci-fi mystery">Sci-fi mystery</SelectItem>
                          <SelectItem value="Dark thriller">Dark thriller</SelectItem>
                          <SelectItem value="Heartfelt drama">Heartfelt drama</SelectItem>
                          <SelectItem value="Action comedy">Action comedy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição simples da história (1–3 frases)</Label>
                    <Textarea
                      value={storyInputs.logline}
                      onChange={(e) => setStoryInputs((p) => ({ ...p, logline: e.target.value }))}
                      className="min-h-[110px]"
                    />
                    <div className="text-xs text-zinc-600">
                      Escreve como você falaria com um amigo. O builder organiza e transforma em estrutura de roteiro.
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Personagem principal (nome)</Label>
                      <Input
                        value={storyInputs.protagonistName}
                        onChange={(e) =>
                          setStoryInputs((p) => ({ ...p, protagonistName: e.target.value }))
                        }
                        placeholder="Ex: Luna"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Força contrária / vilão (nome)</Label>
                      <Input
                        value={storyInputs.antagonistName}
                        onChange={(e) =>
                          setStoryInputs((p) => ({ ...p, antagonistName: e.target.value }))
                        }
                        placeholder="Ex: Noctvi (ou 'A Sombra')"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Quem é o(a) protagonista em 1 linha?</Label>
                    <Input
                      value={storyInputs.protagonistCore}
                      onChange={(e) =>
                        setStoryInputs((p) => ({ ...p, protagonistCore: e.target.value }))
                      }
                      placeholder="Ex: curiosa, corajosa, mas se sente sozinha"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>O que ela/ele quer?</Label>
                      <Input
                        value={storyInputs.protagonistWant}
                        onChange={(e) =>
                          setStoryInputs((p) => ({ ...p, protagonistWant: e.target.value }))
                        }
                        placeholder="Ex: salvar alguém e encontrar seu lugar"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qual medo impede?</Label>
                      <Input
                        value={storyInputs.protagonistFear}
                        onChange={(e) =>
                          setStoryInputs((p) => ({ ...p, protagonistFear: e.target.value }))
                        }
                        placeholder="Ex: falhar e perder quem ama"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Formato</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={String(storyInputs.episodesCount)}
                          onChange={(e) =>
                            setStoryInputs((p) => ({ ...p, episodesCount: Number(e.target.value || 8) }))
                          }
                          placeholder="Eps"
                        />
                        <Input
                          value={String(storyInputs.episodeMinutes)}
                          onChange={(e) =>
                            setStoryInputs((p) => ({ ...p, episodeMinutes: Number(e.target.value || 12) }))
                          }
                          placeholder="Min/ep"
                        />
                      </div>
                      <div className="text-xs text-zinc-600">
                        Dica: 8 eps de 10–12 min funciona muito bem no YouTube.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Classificação</Label>
                      <Select
                        value={storyInputs.rating}
                        onValueChange={(v) => setStoryInputs((p) => ({ ...p, rating: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PG">PG</SelectItem>
                          <SelectItem value="PG-13">PG-13</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-zinc-600">
                        Mantém tudo dentro de PG/PG-13 (sem gore).
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mundo em 1 linha</Label>
                    <Input
                      value={storyInputs.worldOneLine}
                      onChange={(e) => setStoryInputs((p) => ({ ...p, worldOneLine: e.target.value }))}
                      placeholder="Ex: Cidade em tempestade eterna, luzes neon e falhas no céu"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Regras do mundo (bem simples)</Label>
                    <Textarea
                      value={storyInputs.worldRules}
                      onChange={(e) => setStoryInputs((p) => ({ ...p, worldRules: e.target.value }))}
                      className="min-h-[90px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tema (emocional)</Label>
                      <Input
                        value={storyInputs.theme}
                        onChange={(e) => setStoryInputs((p) => ({ ...p, theme: e.target.value }))}
                        placeholder="Ex: coragem mesmo com medo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Set piece (cena épica)</Label>
                      <Input
                        value={storyInputs.setPiece}
                        onChange={(e) => setStoryInputs((p) => ({ ...p, setPiece: e.target.value }))}
                        placeholder="Ex: chuva de meteoros + pixels"
                      />
                    </div>
                  </div>

                  <Button onClick={generateStoryEP1} className="w-full gap-2">
                    <Sparkles className="h-4 w-4" /> Gerar EP1 + Takes (Starter)
                  </Button>

                  <div className="rounded-2xl border bg-zinc-50 p-3 text-xs text-zinc-700">
                    <div className="font-medium">Como usar depois:</div>
                    <div className="mt-1">
                      1) Gera o EP1 + takes aqui. 2) Clique em um take e <b>Enviar</b>. 3) Ajuste e copie o prompt.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5" /> Saída (EP1 + Takes)
                  </CardTitle>
                  <CardDescription>
                    Estrutura premium com cenas, viradas e take list pronto para produzir.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!storyOut ? (
                    <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-600">
                      Preencha os campos e clique <b>Gerar EP1 + Takes</b>.
                    </div>
                  ) : (
                    <Tabs defaultValue="ep1" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="bible">Bíblia</TabsTrigger>
                        <TabsTrigger value="season">Temporada</TabsTrigger>
                        <TabsTrigger value="ep1">EP1 + Takes</TabsTrigger>
                      </TabsList>

                      <TabsContent value="bible" className="pt-3 space-y-2">
                        <div className="flex gap-2">
                          <Button variant="outline" className="gap-2" onClick={() => copyText(storyOut.bible, "bible")}>
                            <Copy className="h-4 w-4" /> {copiedStory === "bible" ? "Copiado!" : "Copiar"}
                          </Button>
                        </div>
                        <div className="rounded-2xl border bg-white p-3">
                          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-900">{storyOut.bible}</pre>
                        </div>
                      </TabsContent>

                      <TabsContent value="season" className="pt-3 space-y-2">
                        <div className="flex gap-2">
                          <Button variant="outline" className="gap-2" onClick={() => copyText(storyOut.seasonOutline, "season")}>
                            <Copy className="h-4 w-4" /> {copiedStory === "season" ? "Copiado!" : "Copiar"}
                          </Button>
                        </div>
                        <div className="rounded-2xl border bg-white p-3">
                          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-900">{storyOut.seasonOutline}</pre>
                        </div>
                      </TabsContent>

                      <TabsContent value="ep1" className="pt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="gap-2" onClick={() => copyText(storyOut.ep1Script, "ep1")}>
                            <Copy className="h-4 w-4" /> {copiedStory === "ep1" ? "Copiado!" : "Copiar roteiro"}
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              const all = storyOut.takes
                                .map((tk) => takeToPromptText(tk, language))
                                .join("\n\n---\n\n");
                              copyText(all, "takes_all");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            {copiedStory === "takes_all" ? "Copiado!" : "Copiar TODOS os takes (prompts)"}
                          </Button>
                        </div>

                        <div className="rounded-2xl border bg-white p-3">
                          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-900">{storyOut.ep1Script}</pre>
                        </div>

                        <Separator />

                        <div className="text-sm font-semibold">Take list</div>
                        <div className="text-xs text-zinc-600">Clique em um take para mandar para o <b>Sora Prompt Builder</b>.</div>

                        <div className="space-y-2">
                          {storyOut.takes.slice(0, 30).map((tk) => {
                            const active = tk.id === selectedTakeId;
                            return (
                              <div
                                key={tk.id}
                                className={`rounded-2xl border p-3 bg-white flex flex-col gap-2 ${active ? "ring-2 ring-zinc-900" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{tk.label}</div>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      <Badge variant="secondary">{tk.duration}</Badge>
                                      <Badge variant="secondary">{tk.shot}</Badge>
                                      <Badge variant="secondary">{tk.motion}</Badge>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => {
                                        const txt = takeToPromptText(tk, language);
                                        copyText(txt, `take_${tk.id}`);
                                      }}
                                    >
                                      <Copy className="h-4 w-4" />
                                      {copiedStory === `take_${tk.id}` ? "Copiado!" : "Copiar"}
                                    </Button>
                                    <Button size="sm" className="gap-2" onClick={() => applyTakeToPromptBuilder(tk)}>
                                      <ArrowRight className="h-4 w-4" /> Enviar
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-xs text-zinc-700 whitespace-pre-wrap">{tk.prose}</div>
                              </div>
                            );
                          })}
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===================== PROMPT BUILDER ===================== */}
          <TabsContent value="prompt" className="mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" /> Inputs
                  </CardTitle>
                  <CardDescription>Modo Leigo (fácil) ou Avançado (controle total).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="simple" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="simple">Modo Leigo</TabsTrigger>
                      <TabsTrigger value="advanced">Avançado</TabsTrigger>
                    </TabsList>

                    <TabsContent value="simple" className="space-y-4 pt-3">
                      <div className="rounded-2xl border bg-white p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">1) Descrição da cena (1–3 frases)</div>
                            <div className="text-xs text-zinc-600">Ex: “Noctvi segura uma taça e vê a cidade em chamas pela vidraça…”</div>
                          </div>
                          <Sparkles className="h-5 w-5 text-zinc-500" />
                        </div>
                        <Textarea value={simpleDescription} onChange={(e) => setSimpleDescription(e.target.value)} className="min-h-[120px]" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>2) Quem aparece?</Label>
                            <Input value={simpleCharacters} onChange={(e) => setSimpleCharacters(e.target.value)} placeholder="Ex: Noctvi (vilão), guarda-costas ao fundo" />
                          </div>
                          <div className="space-y-2">
                            <Label>3) Algum detalhe de roupa?</Label>
                            <Input value={simpleOutfit} onChange={(e) => setSimpleOutfit(e.target.value)} placeholder="Ex: terno escuro, luvas, anel brilhando" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>4) Onde?</Label>
                            <Select value={simplePlace} onValueChange={(v) => setSimplePlace(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="penthouse">Penthouse (vidraça)</SelectItem>
                                <SelectItem value="rooftop">Rooftop</SelectItem>
                                <SelectItem value="street">Street</SelectItem>
                                <SelectItem value="alley">Alley</SelectItem>
                                <SelectItem value="lab">Lab</SelectItem>
                                <SelectItem value="city skyline">City skyline</SelectItem>
                                <SelectItem value="interior room">Interior room</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>5) Horário</Label>
                            <Select value={simpleTime} onValueChange={(v) => setSimpleTime(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="dawn">Dawn</SelectItem>
                                <SelectItem value="day">Day</SelectItem>
                                <SelectItem value="sunset">Sunset</SelectItem>
                                <SelectItem value="night">Night</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>6) Clima</Label>
                            <Select value={simpleWeather} onValueChange={(v) => setSimpleWeather(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="clear">Clear</SelectItem>
                                <SelectItem value="rain">Rain</SelectItem>
                                <SelectItem value="storm">Storm</SelectItem>
                                <SelectItem value="fog">Fog</SelectItem>
                                <SelectItem value="windy">Windy</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Clima emocional</Label>
                            <Select value={simpleMood} onValueChange={(v) => setSimpleMood(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="epic">Epic</SelectItem>
                                <SelectItem value="tense">Tense</SelectItem>
                                <SelectItem value="mysterious">Mysterious</SelectItem>
                                <SelectItem value="intimate">Intimate</SelectItem>
                                <SelectItem value="horror">Horror</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Ritmo</Label>
                            <Select value={simplePace} onValueChange={(v) => setSimplePace(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="slow">Slow</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="fast">Fast</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Enquadramento</Label>
                            <Select value={simpleShot} onValueChange={(v) => setSimpleShot(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="wide">wide</SelectItem>
                                <SelectItem value="medium">medium</SelectItem>
                                <SelectItem value="close-up">close-up</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Movimento de câmera</Label>
                            <Select value={simpleMotion} onValueChange={(v) => setSimpleMotion(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="slow push-in">slow push-in</SelectItem>
                                <SelectItem value="tracking pan">tracking pan</SelectItem>
                                <SelectItem value="orbit micro">orbit micro</SelectItem>
                                <SelectItem value="static lock">static lock</SelectItem>
                                <SelectItem value="handheld subtle">handheld subtle</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Ângulo</Label>
                            <Select
                              value={simpleAngle || "none"}
                              onValueChange={(v) => setSimpleAngle(v === "none" ? "" : (v as any))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">(not specified)</SelectItem>
                                <SelectItem value="low angle">low angle</SelectItem>
                                <SelectItem value="eye-level">eye-level</SelectItem>
                                <SelectItem value="high angle">high angle</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Config</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={simpleRatio} onValueChange={(v) => setSimpleRatio(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="9:16">9:16</SelectItem>
                                  <SelectItem value="16:9">16:9</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={simpleDuration} onValueChange={(v) => setSimpleDuration(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5s">5s</SelectItem>
                                  <SelectItem value="10s">10s</SelectItem>
                                  <SelectItem value="15s">15s</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Rating</Label>
                            <Select value={simpleRating} onValueChange={(v) => setSimpleRating(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PG">PG</SelectItem>
                                <SelectItem value="PG-13">PG-13</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Efeitos</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between rounded-xl border p-2"><span className="text-xs">Glitch</span><Switch checked={fxGlitch} onCheckedChange={setFxGlitch} /></div>
                              <div className="flex items-center justify-between rounded-xl border p-2"><span className="text-xs">Pixels</span><Switch checked={fxPixels} onCheckedChange={setFxPixels} /></div>
                              <div className="flex items-center justify-between rounded-xl border p-2"><span className="text-xs">Fire/Smoke</span><Switch checked={fxFireSmoke} onCheckedChange={setFxFireSmoke} /></div>
                              <div className="flex items-center justify-between rounded-xl border p-2"><span className="text-xs">Lightning</span><Switch checked={fxLightning} onCheckedChange={setFxLightning} /></div>
                              <div className="flex items-center justify-between rounded-xl border p-2"><span className="text-xs">Rain</span><Switch checked={fxRainStreaks} onCheckedChange={setFxRainStreaks} /></div>
                              <div className="flex items-center justify-between rounded-xl border p-2"><span className="text-xs">Embers</span><Switch checked={fxEmbers} onCheckedChange={setFxEmbers} /></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Gerar estrutura</Label>
                            <Button onClick={autoBuildFromSimple} className="w-full gap-2"><Sparkles className="h-4 w-4" /> {t.buildBtn}</Button>
                            <div className="text-xs text-zinc-600">Gera PROSE, CÂMERA, BEATS e ATUAÇÃO automaticamente.</div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4 pt-3">
                      <Tabs defaultValue="style" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="style">Style</TabsTrigger>
                          <TabsTrigger value="scene">Scene</TabsTrigger>
                          <TabsTrigger value="camera">Camera</TabsTrigger>
                        </TabsList>

                        <TabsContent value="style" className="space-y-3 pt-3">
                          <div className="space-y-2">
                            <Label>STYLE LOCK</Label>
                            <Textarea value={styleLock} onChange={(e) => setStyleLock(e.target.value)} className="min-h-[110px]" />
                          </div>

                          <div className="flex items-center justify-between rounded-xl border p-3">
                            <div>
                              <div className="text-sm font-medium">Include FORMAT line</div>
                              <div className="text-xs text-zinc-600">Resolution, fps, aspect ratio, duration, rating.</div>
                            </div>
                            <Switch checked={includeFormat} onCheckedChange={setIncludeFormat} />
                          </div>

                          {includeFormat && (
                            <div className="space-y-2">
                              <Label>FORMAT</Label>
                              <Input value={formatLine} onChange={(e) => setFormatLine(e.target.value)} />
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="scene" className="space-y-3 pt-3">
                          <div className="space-y-2">
                            <Label>{t.proseHeading}</Label>
                            <Textarea value={proseScene} onChange={(e) => setProseScene(e.target.value)} className="min-h-[200px]" />
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <Label>Hard rules</Label>
                            <Textarea value={hardRules} onChange={(e) => setHardRules(e.target.value)} className="min-h-[150px]" />
                          </div>
                        </TabsContent>

                        <TabsContent value="camera" className="space-y-3 pt-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t.cameraShotLabel}</Label>
                              <Select value={shot} onValueChange={(v) => setShot(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="wide">wide</SelectItem>
                                  <SelectItem value="medium">medium</SelectItem>
                                  <SelectItem value="close-up">close-up</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t.cameraMotionLabel}</Label>
                              <Select value={motion} onValueChange={(v) => setMotion(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="slow push-in">slow push-in</SelectItem>
                                  <SelectItem value="handheld subtle">handheld subtle</SelectItem>
                                  <SelectItem value="orbit micro">orbit micro</SelectItem>
                                  <SelectItem value="tracking pan">tracking pan</SelectItem>
                                  <SelectItem value="static lock">static lock</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Angle</Label>
                              <Input value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="low angle / eye-level / dutch tilt..." />
                            </div>
                            <div className="space-y-2">
                              <Label>Distance</Label>
                              <Input value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="rooftop distance / tight framing..." />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.dofLabel} (optional)</Label>
                              <Select value={dof || "none"} onValueChange={(v) => setDof(v === "none" ? "" : (v as any))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">(not specified)</SelectItem>
                                  <SelectItem value="shallow">shallow</SelectItem>
                                  <SelectItem value="deep">deep</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>{t.lightingLabel}</Label>
                              <Textarea value={lightingPalette} onChange={(e) => setLightingPalette(e.target.value)} className="min-h-[90px]" />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>

                      <Separator />

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{t.actsHeading}</Label>
                          <Input value={beat1} onChange={(e) => setBeat1(e.target.value)} placeholder="Beat 1" />
                          <Input value={beat2} onChange={(e) => setBeat2(e.target.value)} placeholder="Beat 2" />
                          <Input value={beat3} onChange={(e) => setBeat3(e.target.value)} placeholder="Beat 3" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.perfHeading}</Label>
                          <Input value={perf1} onChange={(e) => setPerf1(e.target.value)} placeholder={t.perf1Placeholder} />
                          <Input value={perf2} onChange={(e) => setPerf2(e.target.value)} placeholder={t.perf2Placeholder} />

                          <div className="mt-2 flex items-center justify-between rounded-xl border p-3">
                            <div>
                              <div className="text-sm font-medium">Include Dialogue block</div>
                              <div className="text-xs text-zinc-600">Use only if you want lip sync / speech.</div>
                            </div>
                            <Switch checked={includeDialogue} onCheckedChange={setIncludeDialogue} />
                          </div>

                          {includeDialogue && (
                            <div className="space-y-2">
                              {dialogue.map((d, idx) => (
                                <div key={d.id} className="grid grid-cols-1 gap-2 rounded-xl border p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-zinc-600">Line {idx + 1}</div>
                                    {dialogue.length > 1 && (
                                      <Button variant="ghost" size="icon" onClick={() => removeDialogueLine(d.id)} aria-label="Remove line">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  <Input
                                    value={d.who}
                                    onChange={(e) =>
                                      setDialogue((prev) => prev.map((x) => (x.id === d.id ? { ...x, who: e.target.value } : x)))
                                    }
                                    placeholder="Character name"
                                  />
                                  <Input
                                    value={d.line}
                                    onChange={(e) =>
                                      setDialogue((prev) => prev.map((x) => (x.id === d.id ? { ...x, line: e.target.value } : x)))
                                    }
                                    placeholder='"Short line..."'
                                  />
                                </div>
                              ))}
                              <Button variant="outline" onClick={addDialogueLine} className="gap-2">
                                <Plus className="h-4 w-4" /> Add line
                              </Button>
                            </div>
                          )}

                          <Button
                            variant="outline"
                            onClick={() => {
                              if (!beat1) setBeat1("0:00–0:03: Establish + one clean camera move");
                              if (!beat2) setBeat2("0:03–0:07: Half-second hold for micro-acting");
                              if (!beat3) setBeat3("0:07–end: Impact moment + hard cut");
                            }}
                            className="mt-2 w-full gap-2"
                          >
                            <Wand2 className="h-4 w-4" /> Fill sample beats
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="h-5 w-5" /> Live Prompt Preview
                  </CardTitle>
                  <CardDescription>O prompt final sempre começa com “Loko-Motion-Style.”</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border bg-white p-3">
                    <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-900">{prompt}</pre>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => copyText(prompt, "prompt")} className="gap-2">
                      <Copy className="h-4 w-4" /> {copied ? "Copiado!" : "Copy"}
                    </Button>
                    <Button variant="outline" onClick={autoBuildFromSimple} className="gap-2">
                      <Sparkles className="h-4 w-4" /> Auto-build from Simple
                    </Button>
                  </div>
                  <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
                    <div className="font-medium">Atalho</div>
                    <div className="mt-1 text-xs text-zinc-600">No modo leigo: escreva a cena e clique “{t.buildBtn}”.</div>
                    <div className="mt-2 text-xs text-zinc-600">
                      Se você veio do Roteiro Builder: clique em <b>Enviar</b> em um take, e depois ajuste detalhes aqui.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
