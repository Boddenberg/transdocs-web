import type { ReactNode } from "react";

import { CenaAuth } from "@/components/autenticacao/cena-auth";

export default function LayoutAuth({ children }: { children: ReactNode }) {
  return <CenaAuth>{children}</CenaAuth>;
}

