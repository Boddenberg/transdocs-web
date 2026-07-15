import { ScanText } from "lucide-react";

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className={`marca ${compacta ? "marca--compacta" : ""}`}>
      <span className="marca__simbolo" aria-hidden="true">
        <ScanText size={compacta ? 18 : 22} strokeWidth={1.7} />
      </span>
      <span className="marca__nome">ThiagoDocs</span>
      {!compacta && <span className="marca__selo">AI assisted</span>}
    </div>
  );
}
