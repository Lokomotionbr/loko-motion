"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export function AuthBox() {
  const [loading, setLoading] = useState(false);

  async function signInWithGithub() {
    try {
      setLoading(true);
      await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700 }}>Entrar</h2>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Faça login para acessar o Loko Motion.
      </p>

      <div style={{ marginTop: 16 }}>
        <Button onClick={signInWithGithub} disabled={loading}>
          {loading ? "Abrindo login..." : "Entrar com GitHub"}
        </Button>
      </div>
    </div>
  );
}
