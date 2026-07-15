import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileBadge,
  Home,
  ListPlus,
  MapPin,
  UserRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { GrupoExtracao } from "@/types/documentos";

export interface GrupoApresentacao {
  chave: GrupoExtracao;
  rotulo: string;
  icone: LucideIcon;
}

export const gruposApresentacao: GrupoApresentacao[] = [
  { chave: "pessoas", rotulo: "Pessoas e papéis", icone: UserRound },
  { chave: "empresas", rotulo: "Empresas", icone: Building2 },
  { chave: "documentos_identificados", rotulo: "Identificadores", icone: FileBadge },
  { chave: "enderecos", rotulo: "Endereços", icone: MapPin },
  { chave: "datas", rotulo: "Datas", icone: CalendarDays },
  { chave: "valores", rotulo: "Valores", icone: CircleDollarSign },
  { chave: "imoveis", rotulo: "Imóveis", icone: Home },
  { chave: "campos_adicionais", rotulo: "Outros achados", icone: ListPlus }
];
