<div style={{
  padding: 8,
  background: "#fffbcc",
  borderBottom: "1px solid #e6d200",
  fontSize: 12
}}>
  ✅ STUDIO ATIVO — build: {new Date().toISOString()}
</div>

"use client";

import { useState } from "react";
import Builder from "./ui/Builder";
import LokoSEO from "./LokoSEO";

export default function Studio() {
  const [tab, setTab] = useState<"builder" | "seo">("builder");

  return (
    <div className="w-full">
      {/* Barra simples de navegação */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 12,
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 50,
          borderBottom: "1px solid #eee",
        }}
      >
        <button
          onClick={() => setTab("builder")}
          style={{
            padding: "6px 10px",
            border: "1px solid #ddd",
            borderRadius: 8,
            background: tab === "builder" ? "#111" : "white",
            color: tab === "builder" ? "white" : "#111",
            cursor: "pointer",
          }}
        >
          Builder
        </button>

        <button
          onClick={() => setTab("seo")}
          style={{
            padding: "6px 10px",
            border: "1px solid #ddd",
            borderRadius: 8,
            background: tab === "seo" ? "#111" : "white",
            color: tab === "seo" ? "white" : "#111",
            cursor: "pointer",
          }}
        >
          LokoSEO
        </button>
      </div>

      {/* Conteúdo */}
      {tab === "builder" ? <Builder /> : <LokoSEO />}
    </div>
  );
}