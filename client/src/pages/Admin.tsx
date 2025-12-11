import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { Settings, Users, Target, History, Save, Plus, Eye, EyeOff, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [mesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: vendedoras, refetch: refetchVendedoras } =
    trpc.admin.listarTodasVendedoras.useQuery();

  const { data: metas, refetch: refetchMetas } = trpc.admin.obterMetas.useQuery({
    mes: mesAtual,
  });

  const { data: historico } = trpc.admin.obterHistorico.useQuery({
    mes: mesAtual,
  });

  const definirMetaVendedor = trpc.admin.definirMetaVendedor.useMutation({
    onSuccess: () => {
      toast.success("Meta de vendedora atualizada!");
      refetchMetas();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const definirMetaGlobal = trpc.admin.definirMetaGlobal.useMutation({
    onSuccess: () => {
      toast.success("Meta global atualizada!");
      refetchMetas();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const criarVendedora = trpc.admin.criarVendedora.useMutation({
    onSuccess: () => {
      toast.success("Vendedora criada!");
      refetchVendedoras();
      setNovaVendedora({ id: "", nome: "", email: "" });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const alternarVisibilidade = trpc.admin.alternarVisibilidade.useMutation({
    onSuccess: () => {
      toast.success("Visibilidade atualizada!");
      refetchVendedoras();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const [metaGlobalInput, setMetaGlobalInput] = useState("");
  const [superMetaGlobalInput, setSuperMetaGlobalInput] = useState("");
  const [metasVendedorInput, setMetasVendedorInput] = useState<Record<string, string>>({});
  const [novaVendedora, setNovaVendedora] = useState({
    id: "",
    nome: "",
    email: "",
  });

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

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  // Calcular dias úteis do mês
  const calcularDiasUteis = (mes: string) => {
    const [ano, mesNum] = mes.split("-").map(Number);
    let dias = 0;
    const ultimoDia = new Date(ano, mesNum, 0).getDate();
    
    for (let d = 1; d <= ultimoDia; d++) {
      const data = new Date(ano, mesNum - 1, d);
      const dia = data.getDay();
      if (dia !== 0 && dia !== 6) dias++; // Não conta sábado (6) e domingo (0)
    }
    return dias;
  };

  const diasUteis = calcularDiasUteis(mesAtual);
  const semanas = Math.ceil(diasUteis / 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings size={32} />
                Administração
              </h1>
              <p className="text-muted-foreground mt-1">
                {mesAtual} • {diasUteis} dias úteis • {semanas} semanas
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <Tabs defaultValue="metas" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="metas">Metas Globais</TabsTrigger>
            <TabsTrigger value="vendedoras">Vendedoras</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* TAB: METAS GLOBAIS */}
          <TabsContent value="metas" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meta Global */}
              <Card className="border-2 border-blue-500/30">
                <CardHeader className="bg-blue-500/5">
                  <CardTitle className="flex items-center gap-2">
                    <Target size={24} className="text-blue-400" />
                    Meta Global
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Atingir 100% = +25% acelerador para todas
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Mês</Label>
                    <Input value={mesAtual} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Meta Atual</Label>
                    <Input
                      value={
                        metas?.metaGlobal
                          ? formatCurrency(metas.metaGlobal.metaValor)
                          : "Não definida"
                      }
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Nova Meta (R$)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 610000"
                      value={metaGlobalInput}
                      onChange={(e) => setMetaGlobalInput(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleSaveMetaGlobal}
                    disabled={definirMetaGlobal.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Save size={16} className="mr-2" />
                    Salvar Meta Global
                  </Button>
                </CardContent>
              </Card>

              {/* Super Meta Global */}
              <Card className="border-2 border-purple-500/30">
                <CardHeader className="bg-purple-500/5">
                  <CardTitle className="flex items-center gap-2">
                    <Zap size={24} className="text-purple-400" />
                    Super Meta Global
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Atingir 100% = +50% acelerador para todas
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Mês</Label>
                    <Input value={mesAtual} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Super Meta Atual</Label>
                    <Input
                      value={
                        metas?.metaGlobal?.superMetaValor
                          ? formatCurrency(metas.metaGlobal.superMetaValor)
                          : "Não definida"
                      }
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Nova Super Meta (R$)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 800000"
                      value={superMetaGlobalInput}
                      onChange={(e) => setSuperMetaGlobalInput(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleSaveSuperMetaGlobal}
                    disabled={definirMetaGlobal.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Save size={16} className="mr-2" />
                    Salvar Super Meta
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info sobre aceleradores */}
            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">📊 Como funcionam os aceleradores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-blue-400">Meta Global</p>
                    <p className="text-muted-foreground">Se atingir 100%, todas as vendedoras com ≥75% de meta individual ganham +25% na comissão</p>
                  </div>
                  <div>
                    <p className="font-medium text-purple-400">Super Meta Global</p>
                    <p className="text-muted-foreground">Se atingir 100%, todas as vendedoras com ≥75% de meta individual ganham +50% na comissão (cumulativo)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: VENDEDORAS */}
          <TabsContent value="vendedoras" className="space-y-6">
            {/* Criar Vendedora */}
            <Card>
              <CardHeader className="bg-green-500/5">
                <CardTitle className="flex items-center gap-2">
                  <Plus size={24} className="text-green-400" />
                  Nova Vendedora
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wide">ID</Label>
                    <Input
                      placeholder="vend_007"
                      value={novaVendedora.id}
                      onChange={(e) =>
                        setNovaVendedora({ ...novaVendedora, id: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Nome</Label>
                    <Input
                      placeholder="Gabriela Souza"
                      value={novaVendedora.nome}
                      onChange={(e) =>
                        setNovaVendedora({ ...novaVendedora, nome: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide">Email</Label>
                    <Input
                      type="email"
                      placeholder="gabriela@opta.com.br"
                      value={novaVendedora.email}
                      onChange={(e) =>
                        setNovaVendedora({ ...novaVendedora, email: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCriarVendedora}
                  disabled={criarVendedora.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Plus size={16} className="mr-2" />
                  Criar Vendedora
                </Button>
              </CardContent>
            </Card>

            {/* Lista de Vendedoras */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={24} />
                  Gerenciar Vendedoras ({vendedoras?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {vendedoras?.map((vendedora) => (
                    <div
                      key={vendedora.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{vendedora.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {vendedora.id} • Meta:{" "}
                          {metas?.metasVendedor && metas.metasVendedor[vendedora.id as keyof typeof metas.metasVendedor]
                            ? formatCurrency((metas.metasVendedor[vendedora.id as keyof typeof metas.metasVendedor] as any).metaValor)
                            : "Não definida"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Nova meta"
                          value={metasVendedorInput[vendedora.id] || ""}
                          onChange={(e) =>
                            setMetasVendedorInput({
                              ...metasVendedorInput,
                              [vendedora.id]: e.target.value,
                            })
                          }
                          className="w-32 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveMetaVendedor(vendedora.id)}
                          disabled={definirMetaVendedor.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alternarVisibilidade.mutate({ vendedoraId: vendedora.id, visivel: vendedora.visivel === "sim" ? "nao" : "sim" })}
                          disabled={alternarVisibilidade.isPending}
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

          {/* TAB: HISTÓRICO */}
          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History size={24} />
                  Histórico de Alterações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {historico && historico.length > 0 ? (
                    historico.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-card border border-border text-sm"
                      >
                        <p className="font-medium">{item.tipo === "vendedor" ? "Meta Vendedora" : "Meta Global"}</p>
                        <p className="text-muted-foreground">
                          {item.valorAnterior || "-"} → {item.valorNovo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.alteradoEm || new Date()).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Nenhuma alteração registrada</p>
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
