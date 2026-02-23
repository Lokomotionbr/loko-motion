"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AuthBox } from "@/components/ui/AuthBox";
import { Button } from "@/components/ui/button";
import Studio from "@/components/Studio";

type Entitlement = { status: string; plan: string | null };

export default function LokoMotionApp() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [ent, setEnt] = useState<Entitlement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);

      if (data.session?.user?.id) {
        const { data: entData } = await supabase
          .from("entitlements")
          .select("status, plan")
          .eq("user_id", data.session.user.id)
          .single();

        if (mounted) setEnt(entData ?? null);
      }

      setLoading(false);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        const { data: entData } = await supabase
          .from("entitlements")
          .select("status, plan")
          .eq("user_id", newSession.user.id)
          .single();
        setEnt(entData ?? null);
      } else {
        setEnt(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div className="p-6">Carregando...</div>;

  if (!session) return <AuthBox />;

  if (!ent || ent.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-3">
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="opacity-80">
            Seu plano está como <b>{ent?.status ?? "sem cadastro"}</b>. Assine para liberar.
          </p>

          <a href="https://pay.hotmart.com/J104447463Y" target="_blank" rel="noreferrer">
            <Button className="w-full">Assinar agora</Button>
          </a>

          <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  // ✅ Liberado → mostra o Studio (Builder)
  return <Studio />;
}
