"use client";

// IMPORTANTE:
// aqui você precisa importar o arquivo que tem o “Loko Motion App” completo (o builder grande).
// No seu projeto, ele geralmente estava no `src/app/page.auth.tsx` antigamente.
// Se você NÃO tiver esse arquivo, me fala qual arquivo é o “grandão” que renderiza o Loko Motion no localhost.

import LokoMotionApp from "@/app/page.auth";

export default function Builder() {
  return <LokoMotionApp />;
}
