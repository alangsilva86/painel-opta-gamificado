import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Bot,
  CalendarDays,
  ChevronRight,
  MessageSquareText,
  SendHorizonal,
  ShieldAlert,
} from "lucide-react";
import {
  buildFinanceiroAnalystContextLabel,
  createFinanceiroAnalystMessage,
  FINANCEIRO_ANALYST_INITIAL_PROMPTS,
} from "../analystChatUtils";
import type {
  FinanceiroAnalystAction,
  FinanceiroAnalystMessage,
  ResumoFinanceiro,
} from "../types";

type FinanceiroAnalystChatProps = {
  mes: string;
  resumo: ResumoFinanceiro | undefined;
  onAction: (action: FinanceiroAnalystAction) => void;
};

const riskBadgeClass = {
  low: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  medium: "border-amber-400/35 bg-amber-500/10 text-amber-100",
  high: "border-rose-400/35 bg-rose-500/10 text-rose-100",
} as const;

const riskLabel = {
  low: "baixo",
  medium: "moderado",
  high: "alto",
} as const;

export function FinanceiroAnalystChat({
  mes,
  resumo,
  onAction,
}: FinanceiroAnalystChatProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<FinanceiroAnalystMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const analystMutation = trpc.financeiro.chatAnalyst.useMutation();

  const contextLabel = useMemo(
    () => buildFinanceiroAnalystContextLabel(mes, resumo),
    [mes, resumo]
  );

  const previousMesRef = useRef(mes);

  const latestAssistantResponse = useMemo(
    () =>
      messages
        .slice()
        .reverse()
        .find(m => m.role === "assistant" && m.response)
        ?.response ?? null,
    [messages]
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Inject context-changed system message when month changes mid-conversation
  useEffect(() => {
    if (previousMesRef.current === mes) return;
    previousMesRef.current = mes;
    setMessages(prev =>
      prev.length === 0
        ? prev
        : [
            ...prev,
            createFinanceiroAnalystMessage("system", `Contexto atualizado para ${contextLabel}`),
          ]
    );
  }, [mes, contextLabel]);

  const promptSuggestions = latestAssistantResponse?.followUpPrompts.length
    ? latestAssistantResponse.followUpPrompts
    : FINANCEIRO_ANALYST_INITIAL_PROMPTS;

  const hasMessages = messages.length > 0;

  const sendQuestion = async (questionText?: string) => {
    const content = (questionText ?? draft).trim();
    if (!content || analystMutation.isPending) return;

    const nextUserMessage = createFinanceiroAnalystMessage("user", content);
    const nextHistory = [...messages, nextUserMessage];
    setMessages(nextHistory);
    setDraft("");

    try {
      const response = await analystMutation.mutateAsync({
        question: content,
        messages: nextHistory
          .filter(m => m.role !== "system")
          .slice(-8)
          .map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        mes,
      });

      setMessages(prev => [
        ...prev,
        createFinanceiroAnalystMessage("assistant", response.answer, response),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "O analista não conseguiu responder agora.";
      setMessages(prev => [
        ...prev,
        createFinanceiroAnalystMessage("system", message),
      ]);
    }
  };

  const handleActionClick = (action: FinanceiroAnalystAction) => {
    try {
      onAction(action);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar a ação sugerida.";
      setMessages(prev => [
        ...prev,
        createFinanceiroAnalystMessage("system", message),
      ]);
    }
  };

  return (
    <Sheet>
      {/* ── FAB trigger ── */}
      <SheetTrigger asChild>
        <Button
          type="button"
          size="lg"
          className="fixed bottom-5 right-5 z-40 h-14 rounded-full border border-primary/20 bg-primary px-4 text-primary-foreground shadow-[0_16px_48px_rgba(15,23,42,0.32)] transition-transform hover:scale-[1.02] sm:bottom-6 sm:right-6"
        >
          <span className="flex items-center gap-3">
            <span className="rounded-full bg-primary-foreground/15 p-2">
              <MessageSquareText className="h-4 w-4" />
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="metric-label text-primary-foreground/70">
                Analista IA
              </span>
              <span className="text-sm font-semibold">Chat Financeiro</span>
            </span>
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-[min(100vw,44rem)] flex-col gap-0 border-border p-0 sm:max-w-[44rem]"
      >
        {/* ── Header ── */}
        <SheetHeader className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <SheetTitle className="text-sm font-semibold leading-none">
              Analista Financeiro IA
            </SheetTitle>
            <span className="mt-1 block max-w-[22rem] truncate text-xs text-muted-foreground">
              {contextLabel}
            </span>
          </div>

          <Badge
            variant="outline"
            className="shrink-0 border-primary/20 bg-primary/5 text-xs"
          >
            PT-BR
          </Badge>
        </SheetHeader>

        {/* Needed for accessibility */}
        <SheetDescription className="sr-only">
          Chat com o analista financeiro IA. Contexto atual: {contextLabel}
        </SheetDescription>

        {/* ── Área de mensagens ── */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 px-4 py-4">
            {!hasMessages ? (
              <EmptyState onPromptClick={p => void sendQuestion(p)} prompts={promptSuggestions} />
            ) : (
              messages.map(message => {
                /* Mensagem de sistema (ex: contexto atualizado) */
                if (message.role === "system") {
                  return (
                    <div
                      key={message.id}
                      className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground"
                    >
                      {message.content}
                    </div>
                  );
                }

                const isAssistant = message.role === "assistant";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      isAssistant ? "items-start" : "flex-row-reverse items-start"
                    )}
                  >
                    {/* Avatar */}
                    {isAssistant && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}

                    {/* Bolha */}
                    <div
                      className={cn(
                        "max-w-[88%] space-y-2.5 rounded-2xl px-4 py-3",
                        isAssistant
                          ? "rounded-tl-sm border border-border bg-card shadow-sm"
                          : "rounded-tr-sm border border-primary/15 bg-primary/10"
                      )}
                    >
                      {/* Cabeçalho da resposta: risco + summary */}
                      {isAssistant && message.response && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 text-xs",
                              riskBadgeClass[message.response.riskLevel]
                            )}
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Risco {riskLabel[message.response.riskLevel]}
                          </Badge>
                          {message.response.summary && (
                            <span className="text-xs text-muted-foreground">
                              {message.response.summary}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-sm leading-[1.65] text-foreground">
                        {message.content}
                      </p>

                      {/* Evidências */}
                      {message.response?.evidence.length ? (
                        <div className="space-y-1.5">
                          <p className="metric-label">Evidências</p>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {message.response.evidence.map(item => (
                              <div
                                key={item}
                                className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-xs leading-5 text-foreground/80"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Ações sugeridas */}
                      {message.response?.recommendedActions.length ? (
                        <div className="space-y-1.5">
                          <p className="metric-label">Ações sugeridas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {message.response.recommendedActions.map(action => (
                              <Button
                                key={`${message.id}-${action.label}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-auto border-primary/20 bg-primary/5 px-3 py-1.5 text-xs hover:bg-primary/10"
                                onClick={() => handleActionClick(action)}
                              >
                                <CalendarDays className="mr-1 h-3 w-3 text-primary" />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Follow-ups */}
                      {message.response?.followUpPrompts.length ? (
                        <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
                          {message.response.followUpPrompts.map(prompt => (
                            <button
                              key={`${message.id}-${prompt}`}
                              type="button"
                              className="rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                              onClick={() => void sendQuestion(prompt)}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}

            {/* Indicador de digitação */}
            {analystMutation.isPending && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* ── Input + sugestões rápidas ── */}
        <div className="border-t border-border bg-card/60 px-4 pt-2.5 pb-4">
          {/* Sugestões compactas acima do input — apenas quando há conversa */}
          {hasMessages && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {promptSuggestions.slice(0, 4).map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  className="shrink-0 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                  onClick={() => void sendQuestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Ex.: Por que o resultado foi negativo este mês?"
              className="min-h-[2.75rem] flex-1 resize-none bg-background py-2.5 text-sm leading-5"
              rows={1}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendQuestion();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={analystMutation.isPending || draft.trim().length === 0}
              onClick={() => void sendQuestion()}
              aria-label="Enviar pergunta"
            >
              {analystMutation.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
            Enter envia · Shift + Enter quebra linha
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Empty state com sugestões de prompts ── */
function EmptyState({
  prompts,
  onPromptClick,
}: {
  prompts: string[];
  onPromptClick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5 px-1 py-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <MessageSquareText className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium">Analista financeiro pronto</p>
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          Pergunte sobre fluxo de caixa, margem, despesas, tendências ou o gap
          competência/caixa — ou use um dos atalhos abaixo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {prompts.map(prompt => (
          <button
            key={prompt}
            type="button"
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs leading-5 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
            onClick={() => onPromptClick(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
