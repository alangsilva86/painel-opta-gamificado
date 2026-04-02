import { BookOpenText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      "Mostra a produção monetizada do período, separada do pipeline operacional.",
    whenToUse:
      "Use para acompanhar meta executiva, fechamento mensal e comparação de performance.",
  },
  {
    label: "Base vendedora",
    formula: "Comissão total × 0,55 × 0,06 para produtos elegíveis.",
    interpretation:
      "Representa a base usada na remuneração da vendedora, não a comissão Opta cheia.",
    whenToUse:
      "Use para explicar remuneração individual e diferenças entre comissão Opta e incentivo da vendedora.",
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
    interpretation:
      "Mostra o quanto do pipeline operacional ainda não virou produção monetizada.",
    whenToUse:
      "Use para avaliar fila pendente, gargalos operacionais e risco de submonetização.",
  },
  {
    label: "Concentração na líder",
    formula: "Comissão da vendedora líder / comissão total.",
    interpretation:
      "Mede o quanto o resultado do recorte depende de uma única vendedora.",
    whenToUse:
      "Use para gestão de risco comercial em times enxutos e distribuição saudável da produção.",
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

export function MetricGlossaryDrawer({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(triggerClassName)}
        >
          <BookOpenText size={14} />
          Glossário
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Glossário Executivo</SheetTitle>
          <SheetDescription>
            Definições curtas para alinhar leitura, fórmula e uso de cada
            indicador.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4 pb-6">
          {GLOSSARY.map(item => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-muted/40 p-4"
            >
              <h3 className="text-sm font-semibold">{item.label}</h3>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="metric-label">Fórmula</div>
                  <p className="mt-1 text-foreground">{item.formula}</p>
                </div>
                <div>
                  <div className="metric-label">Interpretação</div>
                  <p className="mt-1 text-foreground">{item.interpretation}</p>
                </div>
                <div>
                  <div className="metric-label">Quando usar</div>
                  <p className="mt-1 text-foreground">{item.whenToUse}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
