import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Settings,
  Users,
  Target,
  History,
  Save,
  Plus,
  Eye,
  EyeOff,
  Zap,
  CalendarRange,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetasCalendario } from "@/components/MetasCalendario";
import {
  calcularDiasUteisDoMes,
  calcularSemanasUteisDoMes,
} from "@shared/dateUtils";

export default function Admin() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [mesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: vendedoras, refetch: refetchVendedoras } =
    trpc.admin.listarTodasVendedoras.useQuery();

  const { data: metas, refetch: refetchMetas } = trpc.admin.obterMetas.useQuery(
    {
      mes: mesAtual,
    }
  );

  const { data: historico } = trpc.admin.obterHistorico.useQuery({
    mes: mesAtual,
  });

  const definirMetaVendedor = trpc.admin.definirMetaVendedor.useMutation({
    onSuccess: () => {
      toast.success("Meta de vendedora atualizada!");
      refetchMetas();
      metasOperacionais.refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const definirMetaGlobal = trpc.admin.definirMetaGlobal.useMutation({
    onSuccess: () => {
      toast.success("Meta global atualizada!");
      refetchMetas();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const criarVendedora = trpc.admin.criarVendedora.useMutation({
    onSuccess: () => {
      toast.success("Vendedora criada!");
      refetchVendedoras();
      setNovaVendedora({ id: "", nome: "", email: "" });
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const alternarVisibilidade = trpc.admin.alternarVisibilidade.useMutation({
    onSuccess: () => {
      toast.success("Visibilidade atualizada!");
      refetchVendedoras();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const atualizarMetaDiaria = trpc.admin.atualizarMetaDiaria.useMutation({
    onSuccess: () => {
      toast.success("Meta diária atualizada");
      metasOperacionais.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const atualizarMetaSemanal = trpc.admin.atualizarMetaSemanal.useMutation({
    onSuccess: () => {
      toast.success("Meta semanal atualizada");
      metasOperacionais.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const alternarDiaUtilOperacional =
    trpc.admin.alternarDiaUtilOperacional.useMutation({
      onSuccess: () => {
        toast.success("Calendário operacional atualizado");
        metasOperacionais.refetch();
      },
      onError: error => toast.error(error.message),
    });

  const regenerarMetas = trpc.admin.regenerarMetasVendedora.useMutation({
    onSuccess: () => {
      toast.success("Metas recalculadas com dias úteis");
      metasOperacionais.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const [metaGlobalInput, setMetaGlobalInput] = useState("");
  const [superMetaGlobalInput, setSuperMetaGlobalInput] = useState("");
  const [metasVendedorInput, setMetasVendedorInput] = useState<
    Record<string, string>
  >({});
  const [metasSemanaisInput, setMetasSemanaisInput] = useState<
    Record<number, string>
  >({});
  const [novaVendedora, setNovaVendedora] = useState({
    id: "",
    nome: "",
    email: "",
  });
  const [vendedoraOperacional, setVendedoraOperacional] = useState<string>("");

  const metasOperacionais = trpc.admin.obterMetasOperacionais.useQuery(
    { mes: mesAtual, vendedoraId: vendedoraOperacional },
    { enabled: Boolean(vendedoraOperacional) }
  );

  const metasPorVendedoraId = useMemo(() => {
    return new Map(
      (metas?.metasVendedor ?? []).map((meta: any) => [meta.vendedoraId, meta])
    );
  }, [metas?.metasVendedor]);

  const metaVendedoraSelecionada = vendedoraOperacional
    ? metasPorVendedoraId.get(vendedoraOperacional)
    : null;

  useEffect(() => {
    if (!vendedoraOperacional && vendedoras && vendedoras.length > 0) {
      setVendedoraOperacional(vendedoras[0].id);
    }
  }, [vendedoraOperacional, vendedoras]);

  const handleSaveMetaGlobal = () => {
    if (!metaGlobalInput) {
      toast.error("Digite a Meta Global");
      return;
    }

    definirMetaGlobal.mutate({
      mes: mesAtual,
      metaValor: metaGlobalInput,
    });
  };

  const handleSaveSuperMetaGlobal = () => {
    if (!superMetaGlobalInput) {
      toast.error("Digite a Super Meta Global");
      return;
    }

    definirMetaGlobal.mutate({
      mes: mesAtual,
      metaValor: metas?.metaGlobal?.metaValor || "",
      superMetaValor: superMetaGlobalInput,
    });
  };

  const handleSaveMetaVendedor = (vendedoraId: string) => {
    const valor = metasVendedorInput[vendedoraId];
    if (!valor) {
      toast.error("Digite um valor para a meta");
      return;
    }

    definirMetaVendedor.mutate({
      mes: mesAtual,
      vendedoraId,
      metaValor: valor,
    });
  };

  const handleCriarVendedora = () => {
    if (!novaVendedora.id || !novaVendedora.nome) {
      toast.error("Preencha ID e nome");
      return;
    }

    criarVendedora.mutate(novaVendedora);
  };

  const handleAtualizarMetaDiaria = (
    dia: number,
    payload: {
      modo: "valor" | "percentual";
      metaValor?: number;
      percentualMeta?: number;
    }
  ) => {
    if (!vendedoraOperacional) return;
    atualizarMetaDiaria.mutate({
      mes: mesAtual,
      dia,
      vendedoraId: vendedoraOperacional,
      ...payload,
    });
  };

  const handleToggleDiaUtil = (dia: number, diaUtil: boolean) => {
    alternarDiaUtilOperacional.mutate({
      mes: mesAtual,
      dia,
      diaUtil,
    });
  };

  const handleAtualizarMetaSemanal = (semana: number) => {
    if (!vendedoraOperacional) return;
    const valor = metasSemanaisInput[semana];
    if (!valor) {
      toast.error("Informe a meta semanal");
      return;
    }
    atualizarMetaSemanal.mutate({
      mes: mesAtual,
      semana,
      vendedoraId: vendedoraOperacional,
      metaValor: parseFloat(valor),
    });
  };

  const handleRegenerarMetas = () => {
    if (!vendedoraOperacional) return;
    const metaSelecionada = metasPorVendedoraId.get(vendedoraOperacional);
    const metaValor = metaSelecionada
      ? parseFloat(metaSelecionada.metaValor)
      : undefined;

    regenerarMetas.mutate({
      mes: mesAtual,
      vendedoraId: vendedoraOperacional,
      metaValor,
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const diasUteis = calcularDiasUteisDoMes(mesAtual);
  const diasUteisOperacionais = metasOperacionais.data?.diasUteis ?? diasUteis;
  const semanas = calcularSemanasUteisDoMes(mesAtual);
  const totalVendedoras = vendedoras?.length ?? 0;

  return (
    <div className="page-shell">
      <div className="page-content page-stack pb-12">
        <section className="page-hero">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="status-chip w-fit border-primary/25 bg-primary/10 text-primary">
                Console operacional
              </div>
              <div className="space-y-3">
                <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  <Settings className="h-8 w-8 text-primary" />
                  Administração comercial
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Configure metas globais, planeje metas operacionais e gerencie
                  visibilidade das vendedoras sem alterar o fluxo comercial já
                  existente.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="status-chip">Mês {mesAtual}</div>
                <div className="status-chip">
                  {diasUteisOperacionais} dias úteis
                </div>
                <div className="status-chip">{semanas} semanas planejadas</div>
                <div
                  className={`status-chip ${
                    isAuthenticated
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  {isAuthenticated
                    ? "Sessão autenticada"
                    : "Sessão sem autenticação"}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="h-11 rounded-xl border-border/70 bg-background/70 px-5 text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao dashboard
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="panel-card">
              <CardContent className="space-y-1 p-5">
                <div className="metric-label">Janela ativa</div>
                <div className="text-2xl font-semibold text-foreground">
                  {mesAtual}
                </div>
                <div className="text-xs text-muted-foreground">
                  Base para metas globais e operacionais.
                </div>
              </CardContent>
            </Card>
            <Card className="panel-card">
              <CardContent className="space-y-1 p-5">
                <div className="metric-label">Equipe cadastrada</div>
                <div className="text-2xl font-semibold text-foreground">
                  {totalVendedoras}
                </div>
                <div className="text-xs text-muted-foreground">
                  Vendedoras disponíveis para metas e visibilidade.
                </div>
              </CardContent>
            </Card>
            <Card className="panel-card">
              <CardContent className="space-y-1 p-5">
                <div className="metric-label">Dias úteis</div>
                <div className="text-2xl font-semibold text-foreground">
                  {diasUteisOperacionais}
                </div>
                <div className="text-xs text-muted-foreground">
                  Base para distribuição automática das metas diárias.
                </div>
              </CardContent>
            </Card>
            <Card className="panel-card">
              <CardContent className="space-y-1 p-5">
                <div className="metric-label">Planejamento semanal</div>
                <div className="text-2xl font-semibold text-foreground">
                  {semanas}
                </div>
                <div className="text-xs text-muted-foreground">
                  Semanas úteis consideradas no mês corrente.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Tabs defaultValue="metas" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-background/70 p-2 md:grid-cols-4">
            <TabsTrigger
              value="metas"
              className="rounded-xl px-4 py-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              Metas globais
            </TabsTrigger>
            <TabsTrigger
              value="vendedoras"
              className="rounded-xl px-4 py-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              Vendedoras
            </TabsTrigger>
            <TabsTrigger
              value="operacional"
              className="rounded-xl px-4 py-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              Metas dia/sem
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="rounded-xl px-4 py-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metas" className="space-y-6">
            <div className="page-section-header">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Metas globais e aceleradores
                </h2>
                <p className="page-section-copy">
                  Defina o patamar do mês e os gatilhos de incentivo para toda a
                  operação.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="panel-card-strong">
                <CardHeader className="border-b border-border/60 pb-5">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target size={22} className="text-sky-300" />
                    Meta Global
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Atingir 100% libera +25% de acelerador para vendedoras com
                    pelo menos 75% da meta individual.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Mês
                    </Label>
                    <Input
                      value={mesAtual}
                      disabled
                      className="mt-2 rounded-xl border-border/70 bg-background/70"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Meta atual
                    </Label>
                    <Input
                      value={
                        metas?.metaGlobal
                          ? formatCurrency(metas.metaGlobal.metaValor)
                          : "Não definida"
                      }
                      disabled
                      className="mt-2 rounded-xl border-border/70 bg-background/70"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Nova meta (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 610000"
                      value={metaGlobalInput}
                      onChange={e => setMetaGlobalInput(e.target.value)}
                      className="mt-2 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                  <Button
                    onClick={handleSaveMetaGlobal}
                    disabled={definirMetaGlobal.isPending}
                    className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Save size={16} className="mr-2" />
                    Salvar Meta Global
                  </Button>
                </CardContent>
              </Card>

              <Card className="panel-card-strong">
                <CardHeader className="border-b border-border/60 pb-5">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap size={22} className="text-emerald-300" />
                    Super Meta Global
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Atingir 100% substitui o gatilho anterior e libera +50% de
                    acelerador para vendedoras com pelo menos 75% da meta
                    individual.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Mês
                    </Label>
                    <Input
                      value={mesAtual}
                      disabled
                      className="mt-2 rounded-xl border-border/70 bg-background/70"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Super meta atual
                    </Label>
                    <Input
                      value={
                        metas?.metaGlobal?.superMetaValor
                          ? formatCurrency(metas.metaGlobal.superMetaValor)
                          : "Não definida"
                      }
                      disabled
                      className="mt-2 rounded-xl border-border/70 bg-background/70"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Nova super meta (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 800000"
                      value={superMetaGlobalInput}
                      onChange={e => setSuperMetaGlobalInput(e.target.value)}
                      className="mt-2 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                  <Button
                    onClick={handleSaveSuperMetaGlobal}
                    disabled={definirMetaGlobal.isPending}
                    className="h-11 w-full rounded-xl bg-emerald-500 text-background hover:bg-emerald-400"
                  >
                    <Save size={16} className="mr-2" />
                    Salvar Super Meta
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="panel-card">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Regras de acelerador
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
                  <div className="panel-inset space-y-2 rounded-2xl p-4">
                    <p className="font-medium text-sky-300">Meta global</p>
                    <p className="text-muted-foreground">
                      Ao atingir 100%, todas as vendedoras com pelo menos 75% da
                      meta individual recebem +25% de incentivo.
                    </p>
                  </div>
                  <div className="panel-inset space-y-2 rounded-2xl p-4">
                    <p className="font-medium text-emerald-300">
                      Super meta global
                    </p>
                    <p className="text-muted-foreground">
                      Ao atingir 100%, o acelerador passa para +50% e substitui
                      o gatilho anterior; os percentuais não se acumulam.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendedoras" className="space-y-6">
            <div className="page-section-header">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Gestão de vendedoras
                </h2>
                <p className="page-section-copy">
                  Cadastre novas contas, ajuste metas individuais e controle
                  quem aparece nas superfícies públicas do produto.
                </p>
              </div>
            </div>
            <Card className="panel-card">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus size={22} className="text-emerald-300" />
                  Nova Vendedora
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      ID
                    </Label>
                    <Input
                      placeholder="vend_007"
                      value={novaVendedora.id}
                      onChange={e =>
                        setNovaVendedora({
                          ...novaVendedora,
                          id: e.target.value,
                        })
                      }
                      className="mt-2 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Nome
                    </Label>
                    <Input
                      placeholder="Gabriela Souza"
                      value={novaVendedora.nome}
                      onChange={e =>
                        setNovaVendedora({
                          ...novaVendedora,
                          nome: e.target.value,
                        })
                      }
                      className="mt-2 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="gabriela@opta.com.br"
                      value={novaVendedora.email}
                      onChange={e =>
                        setNovaVendedora({
                          ...novaVendedora,
                          email: e.target.value,
                        })
                      }
                      className="mt-2 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCriarVendedora}
                  disabled={criarVendedora.isPending}
                  className="h-11 w-full rounded-xl bg-emerald-500 text-background hover:bg-emerald-400"
                >
                  <Plus size={16} className="mr-2" />
                  Criar Vendedora
                </Button>
              </CardContent>
            </Card>

            <Card className="table-shell">
              <CardHeader className="pb-5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users size={22} className="text-primary" />
                  Gerenciar Vendedoras ({totalVendedoras})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {vendedoras?.map(vendedora => (
                    <div
                      key={vendedora.id}
                      className="interactive-row flex flex-col gap-3 rounded-2xl border border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {vendedora.nome}
                          </p>
                          <div
                            className={`status-chip ${
                              vendedora.visivel === "sim"
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                                : "border-muted bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {vendedora.visivel === "sim" ? "Visível" : "Oculta"}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {vendedora.id} • Meta:{" "}
                          {metasPorVendedoraId.get(vendedora.id)
                            ? formatCurrency(
                                metasPorVendedoraId.get(vendedora.id).metaValor
                              )
                            : "Não definida"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Nova meta"
                          value={metasVendedorInput[vendedora.id] || ""}
                          onChange={e =>
                            setMetasVendedorInput({
                              ...metasVendedorInput,
                              [vendedora.id]: e.target.value,
                            })
                          }
                          className="h-10 w-full rounded-xl border-border/70 bg-background/80 text-sm sm:w-36"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveMetaVendedor(vendedora.id)}
                          disabled={definirMetaVendedor.isPending}
                          className="h-10 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90"
                        >
                          <Save size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            alternarVisibilidade.mutate({
                              vendedoraId: vendedora.id,
                              visivel:
                                vendedora.visivel === "sim" ? "nao" : "sim",
                            })
                          }
                          disabled={alternarVisibilidade.isPending}
                          className="h-10 rounded-xl border-border/70 bg-background/60 px-3 hover:bg-background/90"
                        >
                          {vendedora.visivel === "sim" ? (
                            <Eye size={14} />
                          ) : (
                            <EyeOff size={14} />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operacional" className="space-y-6">
            <div className="page-section-header">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Planejamento operacional
                </h2>
                <p className="page-section-copy">
                  Ajuste a distribuição diária e semanal por vendedora, mantendo
                  o calendário do mês como referência.
                </p>
              </div>
            </div>
            <Card className="panel-card-strong">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarRange size={22} />
                  Metas Diárias e Semanais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Vendedora
                    </Label>
                    <Select
                      value={vendedoraOperacional}
                      onValueChange={value => setVendedoraOperacional(value)}
                    >
                      <SelectTrigger className="mt-2 rounded-xl border-border/70 bg-background/80">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/70 bg-card/95 text-foreground">
                        {vendedoras?.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Dias úteis
                    </Label>
                    <Input
                      value={metasOperacionais.data?.diasUteis ?? diasUteis}
                      disabled
                      className="mt-2 rounded-xl border-border/70 bg-background/70"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Semanas
                    </Label>
                    <Input
                      value={
                        metasOperacionais.data?.semanasPlanejadas ?? semanas
                      }
                      disabled
                      className="mt-2 rounded-xl border-border/70 bg-background/70"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Ajuste metas operacionais para alinhar execução diária.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerarMetas}
                    disabled={regenerarMetas.isPending || !vendedoraOperacional}
                    className="gap-2 rounded-xl border-border/70 bg-background/60 hover:bg-background/90"
                  >
                    <RefreshCw
                      size={14}
                      className={regenerarMetas.isPending ? "animate-spin" : ""}
                    />
                    Regenerar com dias úteis
                  </Button>
                </div>
              </CardContent>
            </Card>

            {vendedoraOperacional && metasOperacionais.data && (
              <>
                <MetasCalendario
                  mes={mesAtual}
                  vendedoraNome={
                    vendedoras?.find(v => v.id === vendedoraOperacional)
                      ?.nome || "Vendedora"
                  }
                  metasDiarias={
                    metasOperacionais.data.diarias?.map(d => ({
                      dia: d.dia,
                      meta: parseFloat(d.metaValor),
                      percentualMeta: parseFloat(d.percentualMeta),
                      tipo: d.tipo as "automatica" | "manual",
                      diaUtil: d.diaUtil,
                      bloqueado: d.bloqueado,
                    })) || []
                  }
                  metaMensal={parseFloat(
                    metaVendedoraSelecionada?.metaValor ||
                      String(metasOperacionais.data.metaMensal ?? 0)
                  )}
                  distribuicao={metasOperacionais.data.distribuicao}
                  onAtualizarMeta={handleAtualizarMetaDiaria}
                  onToggleDiaUtil={handleToggleDiaUtil}
                  onRegenerar={handleRegenerarMetas}
                  isSaving={atualizarMetaDiaria.isPending}
                  isTogglingDiaUtil={alternarDiaUtilOperacional.isPending}
                />

                <Card className="table-shell">
                  <CardHeader>
                    <CardTitle className="text-lg">Metas Semanais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(metasOperacionais.data.semanais || []).map(semana => (
                      <div
                        key={semana.semana}
                        className="interactive-row flex flex-col gap-3 rounded-2xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">Semana {semana.semana}</p>
                          <p className="text-xs text-muted-foreground">
                            Atual:{" "}
                            {formatCurrency(parseFloat(semana.metaValor))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Nova meta"
                            value={metasSemanaisInput[semana.semana] || ""}
                            onChange={e =>
                              setMetasSemanaisInput({
                                ...metasSemanaisInput,
                                [semana.semana]: e.target.value,
                              })
                            }
                            className="h-10 w-full rounded-xl border-border/70 bg-background/80 text-sm sm:w-32"
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAtualizarMetaSemanal(semana.semana)
                            }
                            disabled={atualizarMetaSemanal.isPending}
                            className="h-10 rounded-xl"
                          >
                            <Save size={14} className="mr-1" />
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ))}
                    {metasOperacionais.data.semanais?.length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        Nenhuma meta semanal gerada para este mês.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <div className="page-section-header">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Histórico de alterações
                </h2>
                <p className="page-section-copy">
                  Acompanhe a trilha de mudanças nas metas para auditar decisões
                  e ajustes do mês.
                </p>
              </div>
            </div>
            <Card className="table-shell">
              <CardHeader className="pb-5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History size={22} className="text-primary" />
                  Histórico de Alterações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {historico && historico.length > 0 ? (
                    historico.map((item, idx) => (
                      <div
                        key={idx}
                        className="interactive-row rounded-2xl border border-border/60 p-4 text-sm"
                      >
                        <p className="font-medium text-foreground">
                          {item.tipo === "vendedor"
                            ? "Meta vendedora"
                            : "Meta global"}
                        </p>
                        <p className="text-muted-foreground">
                          {item.valorAnterior || "-"} → {item.valorNovo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(
                            item.alteradoEm || new Date()
                          ).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state py-10 text-center text-sm text-muted-foreground">
                      Nenhuma alteração registrada neste mês.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
