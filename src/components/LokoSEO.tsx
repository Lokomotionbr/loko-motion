"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Copy, Sparkles, RotateCcw } from "lucide-react";

function clamp(s: string) {
  return (s || "").replace(/\r\n|\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
async function copyToClipboard(text: string) {
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
}

type YesNo = {
  seriesContinuous: boolean;
  adult18: boolean;
  shonenAction: boolean;
  premiumTone: boolean;
  shortEpisodes: boolean;
  fixedSchedule: boolean;
  ptbr: boolean;
  oneUniverse: boolean;
  shorts: boolean;
  monetize: boolean;
};

const DEFAULT_YN: YesNo = {
  seriesContinuous: true,
  adult18: true,
  shonenAction: true,
  premiumTone: true,
  shortEpisodes: true,
  fixedSchedule: true,
  ptbr: true,
  oneUniverse: true,
  shorts: true,
  monetize: true,
};

function uniq(arr: string[]) {
  const s = new Set<string>();
  arr.forEach((x) => {
    const t = x.trim();
    if (t) s.add(t);
  });
  return Array.from(s);
}

function makeKeywords(audience: string, style: string, diff: string, yn: YesNo) {
  const base = [
    "anime",
    "série de anime",
    "episódio",
    "história original",
    yn.shonenAction ? "shonen" : "",
    yn.adult18 ? "anime adulto" : "",
    yn.oneUniverse ? "universo" : "",
    yn.shorts ? "shorts" : "",
    yn.ptbr ? "anime em português" : "",
    "cyberpunk",
    "sci-fi",
    "ação",
    "mistério",
    "plot twist",
    "trilha sonora",
    "sakuga",
  ].filter(Boolean);

  const extra = (audience + " " + style + " " + diff)
    .toLowerCase()
    .split(/[,.;\n]/g)
    .flatMap((p) => p.split(/\s+/))
    .map((w) => w.trim())
    .filter((w) => w.length >= 4)
    .slice(0, 20);

  return uniq([...base, ...extra]).slice(0, 30);
}

function channelAboutShort(seriesName: string, audience: string, style: string, diff: string) {
  const s = seriesName ? `🎬 ${seriesName}` : "🎬 Série original";
  return clamp(
    `${s} — ${clamp(style) || "anime original"}.\n` +
      `Para: ${clamp(audience) || "fãs de anime"}.\n` +
      `Diferencial: ${clamp(diff) || "direção cinematográfica + histórias com viradas."}`
  );
}

function channelAboutLong(seriesName: string, audience: string, style: string, diff: string, yn: YesNo) {
  const s = seriesName ? `Bem-vindo ao canal de ${seriesName}.` : "Bem-vindo ao meu canal de anime original.";
  const lang = yn.ptbr ? "Conteúdo em PT-BR." : "Conteúdo pensado para público global.";
  const format = yn.shortEpisodes
    ? "Episódios curtos e objetivos, com ritmo forte."
    : "Episódios com tempo para drama, construção e impacto.";
  const cadence = yn.fixedSchedule ? "Postagens em frequência fixa." : "Postagens por temporadas e drops.";
  const shorts = yn.shorts ? "Shorts de cenas e ganchos para atrair público pros episódios." : "Foco total nos episódios longos.";
  return clamp(
    `${s}\n\n` +
      `Aqui você encontra ${clamp(style) || "anime premium"} com narrativa forte, personagens vivos e cenas marcantes.\n` +
      `Público: ${clamp(audience) || "fãs de anime"}.\n` +
      `Diferencial: ${clamp(diff) || "direção de atuação + cinematografia + cliffhangers."}\n\n` +
      `${format}\n${cadence}\n${shorts}\n${lang}\n\n` +
      `Se curtir, se inscreve e acompanha a temporada.`
  );
}

function makePinnedComment(seriesName: string, epTopic: string) {
  const s = seriesName ? `${seriesName}` : "a série";
  const topic = clamp(epTopic) || "este episódio";
  return clamp(
    `🔥 Se você curtiu ${topic}, comenta:\n` +
      `1) Qual foi o momento mais forte?\n` +
      `2) Qual teoria você tem pro próximo episódio de ${s}?\n\n` +
      `📌 Se inscreve e ativa o sininho pra não perder os próximos.`
  );
}

function makeVideoDescription(seriesName: string, epNumber: string, epTopic: string, keywords: string[], yn: YesNo) {
  const s = seriesName ? seriesName : "Série original";
  const ep = epNumber ? `EP${epNumber}` : "Episódio";
  const topic = clamp(epTopic) || "um capítulo intenso da história";
  const kwLine = keywords.slice(0, 10).join(", ");
  const hashtags = uniq([
    "#anime",
    yn.shonenAction ? "#shonen" : "",
    "#cyberpunk",
    "#scifi",
    "#acao",
    "#misterio",
    yn.ptbr ? "#animebr" : "",
  ].filter(Boolean)).join(" ");

  return clamp(
    `${s} — ${ep}\n` +
      `${topic}\n\n` +
      `⚡ O que você vai ver:\n` +
      `- Ação + tensão + decisão (sem enrolação)\n` +
      `- Personagens vivos (micro-acting) + direção cinematográfica\n` +
      `- Gancho no final\n\n` +
      `🧠 Pergunta pra você:\n` +
      `Qual teoria você tem pro próximo episódio?\n\n` +
      `📌 Inscreva-se no canal e ative o sininho.\n\n` +
      `🔎 Palavras-chave: ${kwLine}\n` +
      `${hashtags}`
  );
}

function makeTitles(seriesName: string, epNumber: string, epTopic: string, yn: YesNo) {
  const s = seriesName ? seriesName : "Anime Original";
  const ep = epNumber ? `EP${epNumber}` : "EP";
  const topic = clamp(epTopic) || "A virada";
  const vibe = yn.shonenAction ? "AÇÃO" : "MISTÉRIO";
  const a: string[] = [
    `${s} ${ep} — ${topic} (${vibe})`,
    `${ep} — ${topic} | ${s}`,
    `${s}: ${topic} (Episódio ${epNumber || "X"})`,
    `${topic} — ${s} ${ep} (cliffhanger)`,
    `Quando tudo muda… | ${s} ${ep}`,
    `${s} ${ep}: a decisão que ninguém esperava`,
    `${ep} — ${topic} (anime ${yn.adult18 ? "adulto" : "original"})`,
    `${s} ${ep} — tensão máxima (sem enrolação)`,
    `${topic} | ${s} ${ep} (plot twist)`,
    `${s} ${ep} — o começo da guerra`,
  ];
  return a.map((x) => clamp(x)).filter(Boolean);
}

function makeTags(keywords: string[]) {
  const base = keywords.map((k) => k.replace(/\s+/g, " ").trim()).filter(Boolean);
  return uniq(base).slice(0, 35);
}

function thumbPrompts(seriesName: string, epTopic: string, audience: string, yn: YesNo) {
  const s = seriesName ? seriesName : "original anime series";
  const topic = clamp(epTopic) || "a dramatic turning point";
  const aud = clamp(audience) || "adult shonen anime fans";

  const baseRules =
    `16:9 thumbnail image. No text in the image. Leave clean negative space on the LEFT for Canva title. ` +
    `High contrast silhouette readability, strong subject separation, cinematic lighting.`;

  const style = yn.shonenAction
    ? `Pure 2D hand-drawn anime key art, premium cel shading, crisp lineart.`
    : `High-end 2D anime key art, noir mood, premium cel shading, crisp lineart.`;

  const A =
    `Thumbnail Prompt A (Impact): ${baseRules} ${style} ` +
    `One main character in extreme foreground with intense emotion, dramatic rim light. ` +
    `Background shows the main threat of "${topic}" as a clear silhouette. ` +
    `Mood: adrenaline, danger, urgency. Target: ${aud}. Series: ${s}.`;

  const B =
    `Thumbnail Prompt B (Mystery): ${baseRules} ${style} ` +
    `Close-up face, eyes focused, half-shadow. A single mysterious symbol/glitch shape in the background (abstract, no letters). ` +
    `Mood: suspense, secrets, plot twist. Target: ${aud}. Series: ${s}.`;

  const C =
    `Thumbnail Prompt C (Emotion): ${baseRules} ${style} ` +
    `Character holding back tears, jaw tension, soft but high-contrast key light. ` +
    `Background: burning city / storm sky / neon reflections (choose one). ` +
    `Mood: sacrifice, decision, heartbreak. Target: ${aud}. Series: ${s}.`;

  return clamp([A, B, C].join("\n\n"));
}

export default function LokoSEO() {
  const [yn, setYn] = useState<YesNo>(DEFAULT_YN);

  const [seriesName, setSeriesName] = useState("LOKO PROJECT");
  const [audience, setAudience] = useState("Quero atrair público adulto que gosta de anime shonen, ação e mistério.");
  const [style, setStyle] = useState("Anime shonen cyberpunk, ritmo alto, sakuga, trilha épica.");
  const [diff, setDiff] = useState("Cada episódio tem uma virada forte e cenas épicas com direção cinematográfica.");

  const [epNumber, setEpNumber] = useState("01");
  const [epTopic, setEpTopic] = useState("O vilão observa a cidade em chamas e o mapa de guerra pulsa na mesa.");

  const keywords = useMemo(() => makeKeywords(audience, style, diff, yn), [audience, style, diff, yn]);

  const out = useMemo(() => {
    const aboutShort = channelAboutShort(seriesName, audience, style, diff);
    const aboutLong = channelAboutLong(seriesName, audience, style, diff, yn);
    const titles = makeTitles(seriesName, epNumber, epTopic, yn);
    const desc = makeVideoDescription(seriesName, epNumber, epTopic, keywords, yn);
    const tags = makeTags(keywords);
    const pinned = makePinnedComment(seriesName, epTopic);
    const thumb = thumbPrompts(seriesName, epTopic, audience, yn);

    const pack =
      `LOKO SEO — PACOTE COMPLETO\n\n` +
      `CANAL — DESCRIÇÃO CURTA:\n${aboutShort}\n\n` +
      `CANAL — DESCRIÇÃO LONGA:\n${aboutLong}\n\n` +
      `PALAVRAS-CHAVE DO CANAL (use nas descrições e tags):\n- ${keywords.join("\n- ")}\n\n` +
      `VÍDEO — TÍTULOS SUGERIDOS:\n- ${titles.join("\n- ")}\n\n` +
      `VÍDEO — DESCRIÇÃO (copiar e colar):\n${desc}\n\n` +
      `VÍDEO — TAGS:\n${tags.join(", ")}\n\n` +
      `COMENTÁRIO FIXADO:\n${pinned}\n\n` +
      `THUMBNAIL (PROMPTS):\n${thumb}\n`;

    return { aboutShort, aboutLong, titles, desc, tags, pinned, thumb, pack };
  }, [seriesName, audience, style, diff, epNumber, epTopic, keywords, yn]);

  const [copied, setCopied] = useState(false);

  function reset() {
    setYn(DEFAULT_YN);
    setSeriesName("LOKO PROJECT");
    setAudience("Quero atrair público adulto que gosta de anime shonen, ação e mistério.");
    setStyle("Anime shonen cyberpunk, ritmo alto, sakuga, trilha épica.");
    setDiff("Cada episódio tem uma virada forte e cenas épicas com direção cinematográfica.");
    setEpNumber("01");
    setEpTopic("O vilão observa a cidade em chamas e o mapa de guerra pulsa na mesa.");
  }

  const YesNoSwitch = (props: { k: keyof YesNo; label: string }) => (
    <div className="flex items-center justify-between rounded-xl border bg-white p-3">
      <div className="text-sm">{props.label}</div>
      <Switch
        checked={yn[props.k]}
        onCheckedChange={(v) => setYn((p) => ({ ...p, [props.k]: v }))}
      />
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Loko SEO</h2>
            <Badge className="rounded-full">Canal de anime</Badge>
            <Badge variant="secondary" className="rounded-full">Perguntas leigas</Badge>
          </div>
          <p className="text-sm text-zinc-600">
            Responda SIM/NÃO + 3 frases. Eu te entrego SEO do canal, SEO do episódio, comentário fixado e prompts de capa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button
            onClick={async () => {
              await copyToClipboard(out.pack);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="gap-2"
          >
            <Copy className="h-4 w-4" /> {copied ? "Copiado!" : "Copiar pacote"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Perguntas (SIM/NÃO) + 3 frases
            </CardTitle>
            <CardDescription>
              Tudo pensado para canal de anime e série episódica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <YesNoSwitch k="seriesContinuous" label="Seu canal vai ser uma série contínua (episódios com história)?" />
              <YesNoSwitch k="adult18" label="Você quer atrair principalmente público adulto (18+)?" />
              <YesNoSwitch k="shonenAction" label="Seu estilo é mais Shonen/Ação do que drama lento?" />
              <YesNoSwitch k="premiumTone" label="Quer um tom mais premium/cinematográfico (não meme)?" />
              <YesNoSwitch k="shortEpisodes" label="Você quer episódios curtos no começo (até 5–8 min)?" />
              <YesNoSwitch k="fixedSchedule" label="Vai postar com frequência fixa (ex: 1/semana)?" />
              <YesNoSwitch k="ptbr" label="Seu foco inicial é Brasil/Português (PT-BR)?" />
              <YesNoSwitch k="oneUniverse" label="Vai ser um único universo (mesmo mundo/personagens)?" />
              <YesNoSwitch k="shorts" label="Vai usar Shorts para puxar público pros episódios?" />
              <YesNoSwitch k="monetize" label="Quer monetizar no futuro (assinatura/apoio/produtos)?" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Nome da série/canal (1 linha)</Label>
              <Input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Qual público de anime você quer atrair? (1 frase)</Label>
              <Textarea value={audience} onChange={(e) => setAudience(e.target.value)} className="min-h-[90px]" />
            </div>

            <div className="space-y-2">
              <Label>Qual é o estilo da sua série? (1 frase)</Label>
              <Textarea value={style} onChange={(e) => setStyle(e.target.value)} className="min-h-[90px]" />
            </div>

            <div className="space-y-2">
              <Label>O que torna seu anime diferente? (1 frase)</Label>
              <Textarea value={diff} onChange={(e) => setDiff(e.target.value)} className="min-h-[90px]" />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nº do episódio</Label>
                <Input value={epNumber} onChange={(e) => setEpNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Assunto do episódio (1 frase)</Label>
                <Input value={epTopic} onChange={(e) => setEpTopic(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Saída (pronta para copiar e colar)</CardTitle>
            <CardDescription>
              Canal + vídeo + comentário fixado + prompts de capa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-white p-3">
              <div className="text-sm font-semibold mb-2">Descrição do canal (curta)</div>
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-900">{out.aboutShort}</pre>
            </div>

            <div className="rounded-2xl border bg-white p-3">
              <div className="text-sm font-semibold mb-2">Títulos sugeridos</div>
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-900">
                {out.titles.map((t) => `- ${t}`).join("\n")}
              </pre>
            </div>

            <div className="rounded-2xl border bg-white p-3">
              <div className="text-sm font-semibold mb-2">Comentário fixado</div>
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-900">{out.pinned}</pre>
            </div>

            <div className="rounded-2xl border bg-white p-3">
              <div className="text-sm font-semibold mb-2">Prompts de thumbnail (sem texto na imagem)</div>
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-900">{out.thumb}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
