import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { Settings, Users, Target, History, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [mesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: vendedoras, refetch: refetchVendedoras } =
    trpc.admin.listarTodasVendedoras.useQuery(); // Usa listarTodasVendedoras para incluir ocultas

  const { data: metas, refetch: refetchMetas } = trpc.admin.obterMetas.useQuery({
    mes: mesAtual,
  });

  const { data: historico } = trpc.admin.obterHistorico.useQuery({
    mes: mesAtual,
  });

  const definirMetaVendedor = trpc.admin.definirMetaVendedor.useMutation({
    onSuccess: () => {
      toast.success("Meta de vendedora atualizada com sucesso!");
      refetchMetas();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`);
    },
  });

  const definirMetaGlobal = trpc.admin.definirMetaGlobal.useMutation({
    onSuccess: () => {
      toast.success("Meta global atualizada com sucesso!");
      refetchMetas();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar meta global: ${error.message}`);
    },
  });

  const criarVendedora = trpc.admin.criarVendedora.useMutation({
    onSuccess: () => {
      toast.success("Vendedora criada com sucesso!");
      refetchVendedoras();
      setNovaVendedora({ id: "", nome: "", email: "" });
    },
    onError: (error) => {
      toast.error(`Erro ao criar vendedora: ${error.message}`);
    },
  });

  const alternarVisibilidade = trpc.admin.alternarVisibilidade.useMutation({
    onSuccess: () => {
      toast.success("Visibilidade atualizada!");
      refetchVendedoras();
    },
    onError: (error) => {
      toast.error(`Erro ao alterar visibilidade: ${error.message}`);
    },
  });

  const [metaGlobalInput, setMetaGlobalInput] = useState("");
  const [metasVendedorInput, setMetasVendedorInput] = useState<
    Record<string, string>
  >({});
  const [novaVendedora, setNovaVendedora] = useState({
    id: "",
    nome: "",
    email: "",
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Você precisa estar autenticado para acessar o painel administrativo.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveMetaGlobal = () => {
    if (!metaGlobalInput) {
      toast.error("Digite um valor para a meta global");
      return;
    }

    definirMetaGlobal.mutate({
      mes: mesAtual,
      metaValor: metaGlobalInput,
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
      toast.error("Preencha ID e nome da vendedora");
      return;
    }

    criarVendedora.mutate(novaVendedora);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings size={32} />
                Administração
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure metas e gerencie vendedoras
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Meta Global */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={24} />
                Meta Global do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Mês</Label>
                  <Input value={mesAtual} disabled />
                </div>
                <div>
                  <Label>Meta Atual</Label>
                  <Input
                    value={
                      metas?.metaGlobal
                        ? formatCurrency(metas.metaGlobal.metaValor)
                        : "Não definida"
                    }
                    disabled
                  />
                </div>
                <div>
                  <Label>Nova Meta (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 620000"
                    value={metaGlobalInput}
                    onChange={(e) => setMetaGlobalInput(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSaveMetaGlobal}
                  disabled={definirMetaGlobal.isPending}
                  className="w-full"
                >
                  <Save size={16} className="mr-2" />
                  Salvar Meta Global
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Criar Vendedora */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus size={24} />
                Nova Vendedora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>ID</Label>
                  <Input
                    placeholder="Ex: vend_007"
                    value={novaVendedora.id}
                    onChange={(e) =>
                      setNovaVendedora({ ...novaVendedora, id: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input
                    placeholder="Ex: Gabriela Souza"
                    value={novaVendedora.nome}
                    onChange={(e) =>
                      setNovaVendedora({ ...novaVendedora, nome: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Email (opcional)</Label>
                  <Input
                    type="email"
                    placeholder="gabriela@opta.com.br"
                    value={novaVendedora.email}
                    onChange={(e) =>
                      setNovaVendedora({ ...novaVendedora, email: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={handleCriarVendedora}
                  disabled={criarVendedora.isPending}
                  className="w-full"
                >
                  <Plus size={16} className="mr-2" />
                  Criar Vendedora
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metas por Vendedora */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={24} />
              Metas Individuais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendedoras?.map((vendedora) => {
                const metaAtual = metas?.metasVendedor.find(
                  (m) => m.vendedoraId === vendedora.id
                );

                return (
                  <div
                    key={vendedora.id}
                    className={`flex items-end gap-4 p-4 rounded-lg ${
                      vendedora.visivel === "nao"
                        ? "bg-secondary/30 opacity-60"
                        : "bg-secondary/50"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label>{vendedora.nome}</Label>
                        {vendedora.visivel === "nao" && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">
                            Oculta
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Meta atual:{" "}
                        {metaAtual
                          ? formatCurrency(metaAtual.metaValor)
                          : "Não definida"}
                      </div>
                      <Input
                        type="number"
                        placeholder="Nova meta (R$)"
                        value={metasVendedorInput[vendedora.id] || ""}
                        onChange={(e) =>
                          setMetasVendedorInput({
                            ...metasVendedorInput,
                            [vendedora.id]: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        alternarVisibilidade.mutate({
                          vendedoraId: vendedora.id,
                          visivel: vendedora.visivel === "sim" ? "nao" : "sim",
                        })
                      }
                      disabled={alternarVisibilidade.isPending}
                      title={
                        vendedora.visivel === "sim"
                          ? "Ocultar do dashboard"
                          : "Mostrar no dashboard"
                      }
                    >
                      {vendedora.visivel === "sim" ? "👁️" : "🚫"}
                    </Button>
                    <Button
                      onClick={() => handleSaveMetaVendedor(vendedora.id)}
                      disabled={definirMetaVendedor.isPending}
                    >
                      <Save size={16} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Histórico */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History size={24} />
              Histórico de Alterações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historico && historico.length > 0 ? (
                historico.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded"
                  >
                    <div>
                      <div className="font-semibold">
                        {item.tipo === "global" ? "Meta Global" : "Meta Individual"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.valorAnterior
                          ? `${formatCurrency(item.valorAnterior)} → ${formatCurrency(
                              item.valorNovo
                            )}`
                          : `Criada: ${formatCurrency(item.valorNovo)}`}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(item.alteradoEm!).toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma alteração registrada neste mês
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

