import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

    const metaInfo = metasDiarias.find((m) => m.dia === dia);
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
      {/* Header com info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{vendedoraNome}</h3>
          <p className="text-sm text-muted-foreground">
            Meta mensal: {formatCurrency(metaMensal)} • {diasUteis} dias úteis • Meta diária: {formatCurrency(metaDiaria)}
          </p>
        </div>
        <Button
          onClick={onRegenerar}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw size={14} />
          Regenerar Automático
        </Button>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} />
            Metas Diárias - {mes}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {/* Headers dos dias da semana */}
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((dia) => (
              <div key={dia} className="text-center font-semibold text-xs text-muted-foreground py-2">
                {dia}
              </div>
            ))}

            {/* Dias do mês */}
            {dias.map((dia) => {
              const { isFimDeSemana, meta, tipo } = getDiaInfo(dia);
              const isEditando = editandoDia === dia;

              return (
                <div
                  key={dia}
                  className={`p-2 rounded-lg border text-center transition ${
                    isFimDeSemana
                      ? "bg-muted/30 border-muted"
                      : tipo === "manual"
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  {isEditando ? (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        placeholder={meta.toFixed(0)}
                        value={novaMetaInput}
                        onChange={(e) => setNovaMetaInput(e.target.value)}
                        className="h-6 text-xs p-1"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-5 text-xs flex-1"
                          onClick={() => handleSalvarMeta(dia)}
                        >
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 text-xs flex-1"
                          onClick={() => setEditandoDia(null)}
                        >
                          X
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer group"
                      onClick={() => {
                        if (!isFimDeSemana) {
                          setEditandoDia(dia);
                          setNovaMetaInput(meta.toFixed(0));
                        }
                      }}
                    >
                      <p className="font-semibold text-sm">{dia}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(meta).replace("R$ ", "")}
                      </p>
                      {tipo === "manual" && (
                        <Edit2 size={10} className="mx-auto mt-1 opacity-60" />
                      )}
                      {isFimDeSemana && (
                        <p className="text-xs text-muted-foreground mt-1">Fim</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex gap-6 mt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-card border border-border" />
              <span>Automática</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/10 border border-blue-500/30" />
              <span>Manual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted/30 border border-muted" />
              <span>Fim de semana</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
