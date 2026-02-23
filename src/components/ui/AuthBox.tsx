"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AuthBox(props: any) {
  const title = props?.title ?? "Acesso";
  const description = props?.description ?? "Faça login para continuar.";

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="w-full" onClick={props?.onLogin}>
          Entrar
        </Button>
        {props?.children ? <div>{props.children}</div> : null}
      </CardContent>
    </Card>
  );
}
