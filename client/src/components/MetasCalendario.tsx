import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, RefreshCw, Edit2 } from "lucide-react";
import { calcularDiasUteisDoMes } from "@shared/dateUtils";

interface MetaDiaria {
  dia: number;
  meta: number;
  tipo: "automatica" | "manual";
  realizado?: number;
}

interface MetasCalendarioProps {
  mes: string;
  vendedoraNome: string;
  metasDiarias: MetaDiaria[];
  metaMensal: number;
  onAtualizarMeta: (dia: number, novaMetaValor: number) => void;
  onRegenerar: () => void;
}

export function MetasCalendario({
  mes,
  vendedoraNome,
  metasDiarias,
  metaMensal,
  onAtualizarMeta,
  onRegenerar,
}: MetasCalendarioProps) {
  const [editandoDia, setEditandoDia] = useState<number | null>(null);
  const [novaMetaInput, setNovaMetaInput] = useState("");

  const [ano, mesNum] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, mesNum, 0).getDate();

  // Gerar array de dias do mês
  const dias = Array.from({ length: ultimoDia }, (_, i) => i + 1);

  const diasUteis = calcularDiasUteisDoMes(mes);

  const metaDiaria = diasUteis > 0 ? metaMensal / diasUteis : 0;

  const handleSalvarMeta = (dia: number) => {
    const valor = parseFloat(novaMetaInput);
    if (!isNaN(valor) && valor > 0) {
      onAtualizarMeta(dia, valor);
      setEditandoDia(null);
      setNovaMetaInput("");
    }
  };

  const getDiaInfo = (dia: number) => {
    const data = new Date(ano, mesNum - 1, dia);
    const diaSemana = data.getDay();
    const isFimDeSemana = diaSemana === 0 || diaSemana === 6;

    const metaInfo = metasDiarias.find(m => m.dia === dia);
    const meta = metaInfo?.meta || metaDiaria;

    return { isFimDeSemana, meta, tipo: metaInfo?.tipo || "automatica" };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background/55 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="metric-label mb-2">Planejamento diário</div>
          <h3 className="text-lg font-semibold text-foreground">
            {vendedoraNome}
          </h3>
          <p className="text-sm text-muted-foreground">
            Meta mensal: {formatCurrency(metaMensal)} • {diasUteis} dias úteis •
            Meta diária: {formatCurrency(metaDiaria)}
          </p>
        </div>
        <Button
          onClick={onRegenerar}
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl border-border/70 bg-background/60 hover:bg-background/90"
        >
          <RefreshCw size={14} />
          Regenerar Automático
        </Button>
      </div>

      <Card className="table-shell">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar size={20} />
            Metas Diárias - {mes}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {/* Headers dos dias da semana */}
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map(dia => (
              <div
                key={dia}
                className="py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                {dia}
              </div>
            ))}

            {/* Dias do mês */}
            {dias.map(dia => {
              const { isFimDeSemana, meta, tipo } = getDiaInfo(dia);
              const isEditando = editandoDia === dia;

              return (
                <div
                  key={dia}
                  className={`rounded-2xl border p-2 text-center transition ${
                    isFimDeSemana
                      ? "border-border/50 bg-background/40"
                      : tipo === "manual"
                        ? "border-primary/35 bg-primary/10"
                        : "border-border/60 bg-background/70 hover:border-primary/40"
                  }`}
                >
                  {isEditando ? (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        placeholder={meta.toFixed(0)}
                        value={novaMetaInput}
                        onChange={e => setNovaMetaInput(e.target.value)}
                        className="h-7 rounded-lg border-border/70 bg-background/80 p-1 text-xs"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 flex-1 rounded-lg px-2 text-xs"
                          onClick={() => handleSalvarMeta(dia)}
                        >
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 flex-1 rounded-lg px-2 text-xs"
                          onClick={() => setEditandoDia(null)}
                        >
                          X
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="group w-full rounded-xl p-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      onClick={() => {
                        if (!isFimDeSemana) {
                          setEditandoDia(dia);
                          setNovaMetaInput(meta.toFixed(0));
                        }
                      }}
                    >
                      <p className="text-center text-sm font-semibold text-foreground">
                        {dia}
                      </p>
                      <p className="text-center text-xs text-muted-foreground">
                        {formatCurrency(meta).replace("R$ ", "")}
                      </p>
                      {tipo === "manual" && (
                        <Edit2
                          size={10}
                          className="mx-auto mt-1 text-primary/70"
                        />
                      )}
                      {isFimDeSemana && (
                        <p className="mt-1 text-center text-xs text-muted-foreground">
                          Fim
                        </p>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-6 mt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-background/70 border border-border/60" />
              <span>Automática</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-primary/35 bg-primary/10" />
              <span>Manual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-border/50 bg-background/40" />
              <span>Fim de semana</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
