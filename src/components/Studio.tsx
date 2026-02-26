"use client";

import { useState } from "react";
import Builder from "./Builder";
import LokoSEO from "./LokoSEO";

export default function Studio() {
  const [tab, setTab] = useState<"builder" | "seo">("builder");

  return (
    <div className="w-full">
      <div style={{ display: "flex", gap: 8, padding: 12 }}>
        <button onClick={() => setTab("builder")}>Builder</button>
        <button onClick={() => setTab("seo")}>LokoSEO</button>
      </div>

      {tab === "builder" ? <Builder /> : <LokoSEO />}
    </div>
  );
}