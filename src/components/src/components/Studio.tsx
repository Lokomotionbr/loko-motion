"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import Builder from "@/components/Builder"; // seu Builder atual (roteiro + sora prompt)
import TakeJsonBuilder from "@/components/TakeJsonBuilder"; // o gerador de takes JSON
import LokoSEO from "@/components/LokoSEO"; // o novo Loko SEO

export default function Studio() {
  const [tab, setTab] = useState("diretor");

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-zinc-50 to-white p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Loko Motion — Studio de Bolso
          </h1>
          <Badge className="rounded-full">Tudo em 1</Badge>
          <Badge variant="secondary" className="rounded-full">Sem preço no app</Badge>
        </div>

        <p className="mt-2 text-sm text-zinc-600">
          Roteiro • Takes • Prompt • Correções • YouTube (SEO) — tudo no mesmo lugar.
        </p>

        <Separator className="my-5" />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="diretor">Diretor IA</TabsTrigger>
            <TabsTrigger value="takes">Takes JSON</TabsTrigger>
            <TabsTrigger value="seo">Loko SEO</TabsTrigger>
            <TabsTrigger value="doctor">Take Doctor</TabsTrigger>
            <TabsTrigger value="trilha">Trilha (Suno)</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="diretor" className="mt-4">
            <Builder />
          </TabsContent>

          <TabsContent value="takes" className="mt-4">
            <TakeJsonBuilder />
          </TabsContent>

          <TabsContent value="seo" className="mt-4">
            <LokoSEO />
          </TabsContent>

          {/* placeholders (a gente implementa depois) */}
          <TabsContent value="doctor" className="mt-4">
            <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-700">
              Take Doctor (em breve): cole o JSON → marque o erro → receba JSON corrigido + Plano B/C.
            </div>
          </TabsContent>

          <TabsContent value="trilha" className="mt-4">
            <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-700">
              Trilha (Suno) (em breve): escolha “Cinematográfico” ou “Anime” e gere prompt de trilha por cena/take.
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-4">
            <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-700">
              Export Pack (em breve): copiar tudo / baixar .json / baixar pacotão (SEO + takes + prompts).
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
