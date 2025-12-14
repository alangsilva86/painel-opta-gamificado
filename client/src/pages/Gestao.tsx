import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

function startOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function formatCurrency(value?: number) {
  if (typeof value !== "number") return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function formatPercent(value?: number) {
  if (typeof value !== "number") return "0%";
  return `${(value * 100).toFixed(1)}%`;
}

export default function Gestao() {
  const now = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState(startOfMonthISO(now));
  const [dateTo, setDateTo] = useState(endOfMonthISO(now));
  const [authed, setAuthed] = useState(true);
  const [password, setPassword] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      dateFrom,
      dateTo,
    }),
    [dateFrom, dateTo]
  );

  const resumoQuery = trpc.gestao.getResumo.useQuery(filters, {
    enabled: authed,
    retry: false,
    onError(error) {
      if (error.message.includes("Acesso Gestão não autorizado")) {
        setAuthed(false);
      }
    },
  });

  const drilldownQuery = trpc.gestao.getDrilldown.useQuery(
    { ...filters, page, pageSize: 20 },
    {
      enabled: authed,
      retry: false,
      onError(error) {
        if (error.message.includes("Acesso Gestão não autorizado")) {
          setAuthed(false);
        }
      },
    }
  );

  const exportQuery = trpc.gestao.exportCSV.useQuery(filters, { enabled: false });

  const authMutation = trpc.gestao.auth.useMutation({
    onSuccess: () => {
      setAuthed(true);
      resumoQuery.refetch();
      drilldownQuery.refetch();
      toast.success("Acesso liberado");
    },
    onError: () => toast.error("Senha inválida"),
  });

  useEffect(() => {
    if (resumoQuery.data) setAuthed(true);
  }, [resumoQuery.data]);

  const handleExport = async () => {
    const res = await exportQuery.refetch();
    if (!res.data?.csv) return;
    const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gestao_${dateFrom}_a_${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = resumoQuery.isLoading || drilldownQuery.isLoading;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
        <Card className="w-full max-w-md bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle>Acesso Gestão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300">
              Insira a senha fixa para liberar a visualização dos KPIs de Gestão.
            </p>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
            />
            <Button
              className="w-full"
              onClick={() => authMutation.mutate({ password })}
              disabled={authMutation.isLoading || !password}
            >
              {authMutation.isLoading ? "Validando..." : "Entrar"}
            </Button>
            {authMutation.error && (
              <p className="text-sm text-red-400">Erro: {authMutation.error.message}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestão</h1>
          <p className="text-sm text-slate-300">KPIs e drilldown com base nos dados normalizados.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Data início</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-950 border-slate-800"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Data fim</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-950 border-slate-800"
            />
          </div>
          <Button onClick={() => { resumoQuery.refetch(); drilldownQuery.refetch(); }}>Aplicar filtros</Button>
          <Button variant="outline" onClick={handleExport} disabled={exportQuery.isFetching}>
            {exportQuery.isFetching ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-slate-300">
          <Spinner className="h-5 w-5" />
          <span>Carregando dados...</span>
        </div>
      )}

      {resumoQuery.data && (
        <>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard title="Contratos" value={resumoQuery.data.cards.contratos.toLocaleString("pt-BR")} />
            <MetricCard title="Líquido" value={formatCurrency(resumoQuery.data.cards.liquido)} />
            <MetricCard title="Comissão" value={formatCurrency(resumoQuery.data.cards.comissao)} />
            <MetricCard title="Take Rate" value={formatPercent(resumoQuery.data.cards.takeRate)} />
            <MetricCard title="Ticket Médio" value={formatCurrency(resumoQuery.data.cards.ticketMedio)} />
            <MetricCard
              title="% Comissão Calculada"
              value={formatPercent(resumoQuery.data.cards.pctComissaoCalculada)}
            />
          </div>

          <Separator className="bg-slate-800" />

          <Card className="bg-slate-950 border-slate-800">
            <CardHeader>
              <CardTitle>Drilldown</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Líquido</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldownQuery.data?.data.map((row) => (
                    <TableRow key={row.idContrato}>
                      <TableCell className="font-mono text-xs">{row.numeroContrato || row.idContrato}</TableCell>
                      <TableCell>{row.dataPagamento ? new Date(row.dataPagamento).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell>{row.vendedorNome}</TableCell>
                      <TableCell>{row.produto}</TableCell>
                      <TableCell>{row.etapaPipeline}</TableCell>
                      <TableCell>{formatCurrency(row.liquido)}</TableCell>
                      <TableCell>{formatCurrency(row.comissaoTotal)}</TableCell>
                      <TableCell className="text-xs text-slate-400 space-x-1">
                        {row.flags.inconsistenciaDataPagamento && <span>data*</span>}
                        {row.flags.liquidoFallback && <span>liq_fallback</span>}
                        {row.flags.comissaoCalculada && <span>calc%</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Página anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                  Próxima página
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-xl font-semibold">{value}</CardContent>
    </Card>
  );
}
