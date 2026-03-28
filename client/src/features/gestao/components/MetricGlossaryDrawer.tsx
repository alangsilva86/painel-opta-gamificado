import { BookOpenText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const GLOSSARY = [
  {
    label: "Comissão total",
    formula: "Soma de toda a comissão total do recorte filtrado.",
    interpretation:
      "Mostra o valor monetizado no período, independentemente do volume líquido.",
    whenToUse:
      "Use para acompanhar meta executiva, fechamento mensal e comparação de performance.",
  },
  {
    label: "Pace vs necessário/dia",
    formula:
      "Pace = comissão acumulada / dias decorridos. Necessário/dia = gap para meta / dias restantes.",
    interpretation:
      "Compara a cadência real da operação com a cadência necessária para fechar a meta.",
    whenToUse: "Use como principal termômetro de risco de fechamento.",
  },
  {
    label: "Take rate",
    formula: "Comissão total / líquido liberado.",
    interpretation: "Mede a rentabilidade média do mix atual.",
    whenToUse:
      "Use para separar crescimento saudável de crescimento com margem pressionada.",
  },
  {
    label: "Share sem comissão",
    formula: "Contratos sem comissão / contratos totais.",
    interpretation: "Mostra o quanto do volume ainda não virou receita.",
    whenToUse:
      "Use para avaliar fila pendente, gargalos operacionais e risco de submonetização.",
  },
  {
    label: "Concentração Top 5",
    formula: "Comissão dos cinco maiores sellers / comissão total.",
    interpretation: "Mede dependência excessiva em poucos nomes.",
    whenToUse:
      "Use para gestão de risco comercial e distribuição saudável da produção.",
  },
  {
    label: "Qualidade de dados",
    formula:
      "Score composto por fallback de líquido, comissão calculada e contratos sem comissão.",
    interpretation:
      "Traduz a confiança do recorte executivo em um score simples.",
    whenToUse:
      "Use antes de discutir o painel em reunião executiva ou comparar períodos.",
  },
];

export function MetricGlossaryDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-slate-800 bg-slate-950 text-slate-100"
        >
          <BookOpenText size={14} />
          Glossário
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="border-slate-800 bg-slate-950 text-white sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>Glossário Executivo</SheetTitle>
          <SheetDescription className="text-slate-400">
            Definições curtas para alinhar leitura, fórmula e uso de cada
            indicador.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4 pb-6">
          {GLOSSARY.map(item => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <h3 className="text-sm font-semibold text-white">{item.label}</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Fórmula
                  </div>
                  <p className="mt-1">{item.formula}</p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Interpretação
                  </div>
                  <p className="mt-1">{item.interpretation}</p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Quando usar
                  </div>
                  <p className="mt-1">{item.whenToUse}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
