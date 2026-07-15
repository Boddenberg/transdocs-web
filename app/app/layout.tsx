import type { ReactNode } from "react";

import "./aplicacao.css";
import "./analise.css";

import { ShellAplicacao } from "@/components/aplicacao/shell-aplicacao";

export default function LayoutAplicacao({ children }: { children: ReactNode }) {
  return <ShellAplicacao>{children}</ShellAplicacao>;
}
