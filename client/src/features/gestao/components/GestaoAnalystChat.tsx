import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Bot,
  ChevronRight,
  MessageSquareText,
  SendHorizonal,
  ShieldAlert,
} from "lucide-react";
import {
  buildGestaoAnalystContextLabel,
  buildGestaoAnalystContextSignature,
  createGestaoAnalystContextUpdatedMessage,
  createGestaoAnalystMessage,
  GESTAO_ANALYST_INITIAL_PROMPTS,
} from "../analystChatUtils";
import { getToneClasses } from "../visualSemantics";
import type {
  GestaoAnalystAction,
  GestaoAnalystMessage,
  GestaoResumoData,
  GestaoSavedView,
  GestaoViewState,
} from "../types";

type GestaoAnalystChatProps = {
  viewState: GestaoViewState;
  summary: GestaoResumoData;
  availableViews: GestaoSavedView[];
  onAction: (action: GestaoAnalystAction) => void | Promise<void>;
};

const riskToneMap = {
  low: getToneClasses("good"),
  medium: getToneClasses("warning"),
  high: getToneClasses("critical"),
} as const;

export function GestaoAnalystChat({
  viewState,
  summary,
  availableViews,
  onAction,
}: GestaoAnalystChatProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<GestaoAnalystMessage[]>([]);
  const analystMutation = trpc.gestao.chatAnalyst.useMutation();

  const contextLabel = useMemo(
    () => buildGestaoAnalystContextLabel(viewState, summary),
    [summary, viewState]
  );
  const contextSignature = useMemo(
    () => buildGestaoAnalystContextSignature(viewState),
    [viewState]
  );
  const previousSignatureRef = useRef(contextSignature);

  const latestAssistantResponse = useMemo(
    () =>
      messages
        .slice()
        .reverse()
        .find(message => message.role === "assistant" && message.response)
        ?.response ?? null,
    [messages]
  );

  useEffect(() => {
    if (previousSignatureRef.current === contextSignature) return;
    previousSignatureRef.current = contextSignature;
    setMessages(prev =>
      prev.length === 0
        ? prev
        : [...prev, createGestaoAnalystContextUpdatedMessage(contextLabel)]
    );
  }, [contextLabel, contextSignature]);

  const promptSuggestions =
    latestAssistantResponse?.followUpPrompts.length
      ? latestAssistantResponse.followUpPrompts
      : GESTAO_ANALYST_INITIAL_PROMPTS;

  const sendQuestion = async (questionText?: string) => {
    const content = (questionText ?? draft).trim();
    if (!content || analystMutation.isPending) return;

    const nextUserMessage = createGestaoAnalystMessage("user", content);
    const nextHistory = [...messages, nextUserMessage];
    setMessages(nextHistory);
    setDraft("");

    try {
      const response = await analystMutation.mutateAsync({
        question: content,
        messages: nextHistory.slice(-8).map(message => ({
          role: message.role,
          content: message.content,
        })),
        viewState,
        availableViews: availableViews.map(view => ({
          id: view.id,
          name: view.name,
          kind: view.kind,
        })),
      });

      setMessages(prev => [
        ...prev,
        createGestaoAnalystMessage("assistant", response.answer, response),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "O analista não conseguiu responder agora.";
      setMessages(prev => [...prev, createGestaoAnalystMessage("system", message)]);
    }
  };

  const handleActionClick = async (action: GestaoAnalystAction) => {
    try {
      await onAction(action);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar a ação sugerida.";
      setMessages(prev => [...prev, createGestaoAnalystMessage("system", message)]);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground section-heading">
          Analista IA da Gestão
        </h2>
        <p className="text-sm text-muted-foreground">
          Faça perguntas sobre o recorte atual e aplique recomendações sem sair
          do painel.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="gap-3 border-b border-border/80 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" />
                Chat analítico executivo
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Respostas didáticas, orientadas à decisão e ancoradas no recorte
                aplicado.
              </p>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10">
              PT-BR • BI Executivo
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 pt-6 xl:grid-cols-[minmax(0,1.6fr)_320px]">
          <div className="space-y-4">
            <ScrollArea className="h-[32rem] rounded-xl border border-border/70 bg-background/40 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 text-center">
                    <div className="rounded-full border border-primary/20 bg-primary/10 p-3 text-primary">
                      <MessageSquareText className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        O analista está pronto para ler este recorte.
                      </p>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        Pergunte sobre meta, take rate, riscos, concentração,
                        mix, qualidade do dado ou peça o melhor recorte para
                        investigar um ponto específico.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map(message => {
                    if (message.role === "system") {
                      return (
                        <div
                          key={message.id}
                          className="rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground"
                        >
                          {message.content}
                        </div>
                      );
                    }

                    const isAssistant = message.role === "assistant";
                    const riskTone = message.response
                      ? riskToneMap[message.response.riskLevel]
                      : null;

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "max-w-[92%] rounded-2xl border px-4 py-3 shadow-sm",
                          isAssistant
                            ? "border-border bg-card"
                            : "ml-auto border-primary/20 bg-primary/10"
                        )}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {isAssistant ? "Analista" : "Gestor"}
                            </div>
                            {message.response && riskTone ? (
                              <Badge
                                variant="outline"
                                className={cn("gap-1", riskTone.badgeClass)}
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Risco{" "}
                                {message.response.riskLevel === "low"
                                  ? "baixo"
                                  : message.response.riskLevel === "medium"
                                    ? "moderado"
                                    : "alto"}
                              </Badge>
                            ) : null}
                          </div>

                          <p className="text-sm leading-6 text-foreground">
                            {message.content}
                          </p>

                          {message.response?.evidence.length ? (
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Evidências
                              </div>
                              <div className="grid gap-2 md:grid-cols-2">
                                {message.response.evidence.map(item => (
                                  <div
                                    key={item}
                                    className="rounded-xl border border-border/80 bg-background/60 px-3 py-2 text-xs text-foreground/85"
                                  >
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {message.response?.recommendedActions.length ? (
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Ações sugeridas
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {message.response.recommendedActions.map(action => (
                                  <Button
                                    key={`${message.id}-${action.label}`}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-auto min-h-9 border-primary/20 bg-primary/5 px-3 py-2 text-left text-xs"
                                    onClick={() => {
                                      void handleActionClick(action);
                                    }}
                                  >
                                    <span className="flex items-center gap-2">
                                      <ChevronRight className="h-3.5 w-3.5 text-primary" />
                                      {action.label}
                                    </span>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {message.response?.followUpPrompts.length ? (
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Próximas perguntas
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {message.response.followUpPrompts.map(prompt => (
                                  <Button
                                    key={`${message.id}-${prompt}`}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto rounded-full border border-border px-3 py-1.5 text-xs"
                                    onClick={() => {
                                      void sendQuestion(prompt);
                                    }}
                                  >
                                    {prompt}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="space-y-3 rounded-2xl border border-border bg-background/40 p-4">
              <Textarea
                value={draft}
                onChange={event => setDraft(event.target.value)}
                placeholder="Ex.: Por que o take rate caiu neste período?"
                className="min-h-28 resize-none border-border bg-card"
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendQuestion();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Enter envia. Shift + Enter quebra linha.
                </p>
                <Button
                  type="button"
                  className="gap-2"
                  disabled={analystMutation.isPending || draft.trim().length === 0}
                  onClick={() => {
                    void sendQuestion();
                  }}
                >
                  {analystMutation.isPending ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Analisando
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="h-4 w-4" />
                      Perguntar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Contexto atual
                </div>
                <p className="text-sm leading-6 text-foreground">{contextLabel}</p>
              </div>
              <Separator className="my-4 bg-border/80" />
              <div className="grid gap-2">
                <Badge variant="outline" className="justify-start">
                  {summary.businessStatus.headline}
                </Badge>
                <Badge variant="outline" className="justify-start">
                  {summary.freshness.label}
                </Badge>
                <Badge variant="outline" className="justify-start">
                  {summary.dataQuality.label}
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Perguntas sugeridas
                </div>
                <div className="flex flex-wrap gap-2">
                  {promptSuggestions.map(prompt => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto whitespace-normal px-3 py-2 text-left text-xs"
                      onClick={() => {
                        void sendQuestion(prompt);
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  O que ele pode fazer
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Explicar o recorte com linguagem executiva e didática.</li>
                  <li>Apontar risco, evidências numéricas e próximos passos.</li>
                  <li>Aplicar filtros, comparação, granularidade e vistas salvas.</li>
                </ul>
              </div>
            </div>
          </aside>
        </CardContent>
      </Card>
    </section>
  );
}
