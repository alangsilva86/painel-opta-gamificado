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
  AlertTriangle,
  ArrowRightLeft,
  Bot,
  CalendarDays,
  MessageSquareText,
  SendHorizonal,
  ShieldAlert,
} from "lucide-react";
import {
  buildFinanceiroAnalystContextLabel,
  buildFinanceiroAnalystContextSignature,
  createFinanceiroAnalystMessage,
  FINANCEIRO_ANALYST_INITIAL_PROMPTS,
} from "../analystChatUtils";
import type {
  FinanceiroAnalystAction,
  FinanceiroAnalystFocus,
  FinanceiroAnalystMessage,
  ResumoFinanceiro,
} from "../types";

type FinanceiroAnalystChatProps = {
  mes: string;
  resumo: ResumoFinanceiro | undefined;
  compareTo?: string | null;
  focus?: FinanceiroAnalystFocus;
  onAction: (action: FinanceiroAnalystAction) => void;
};

const decisionToneClass = {
  good: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  watch: "border-amber-400/35 bg-amber-500/10 text-amber-100",
  critical: "border-rose-400/35 bg-rose-500/10 text-rose-100",
} as const;

const decisionLabel = {
  good: "bom",
  watch: "atenção",
  critical: "crítico",
} as const;

const confidenceLabel = {
  low: "confiança baixa",
  medium: "confiança média",
  high: "confiança alta",
} as const;

const urgencyLabel = {
  now: "Agora",
  this_week: "Esta semana",
  monitor: "Monitorar",
} as const;

export function FinanceiroAnalystChat({
  mes,
  resumo,
  compareTo,
  focus = "overview",
  onAction,
}: FinanceiroAnalystChatProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<FinanceiroAnalystMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const analystMutation = trpc.financeiro.chatAnalyst.useMutation();

  const contextLabel = useMemo(
    () => buildFinanceiroAnalystContextLabel(mes, resumo, compareTo, focus),
    [compareTo, focus, mes, resumo]
  );
  const contextSignature = useMemo(
    () => buildFinanceiroAnalystContextSignature(mes, compareTo, focus),
    [compareTo, focus, mes]
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (previousSignatureRef.current === contextSignature) return;
    previousSignatureRef.current = contextSignature;
    setMessages(prev =>
      prev.length === 0
        ? prev
        : [
            createFinanceiroAnalystMessage(
              "system",
              `Contexto atualizado para ${contextLabel}. A conversa foi reiniciada para evitar mistura entre períodos.`
            ),
          ]
    );
  }, [contextLabel, contextSignature]);

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
          .filter(message => message.role !== "system")
          .slice(-8)
          .map(message => ({
            role: message.role as "user" | "assistant",
            content: message.content,
          })),
        mes,
        requestedPeriod: mes,
        compareTo: compareTo ?? undefined,
        focus,
      });

      setMessages(prev => [
        ...prev,
        createFinanceiroAnalystMessage(
          "assistant",
          response.narrative || response.decision.message || response.headline,
          response
        ),
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
                SO Executivo
              </span>
              <span className="text-sm font-semibold">Financeiro</span>
            </span>
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-[min(100vw,48rem)] flex-col gap-0 border-border p-0 sm:max-w-[48rem]"
      >
        <SheetHeader className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <SheetTitle className="text-sm font-semibold leading-none">
              SO Executivo Financeiro
            </SheetTitle>
            <span className="mt-1 block max-w-[28rem] truncate text-xs text-muted-foreground">
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

        <SheetDescription className="sr-only">
          Chat executivo financeiro da Opta. Contexto atual: {contextLabel}
        </SheetDescription>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 px-4 py-4">
            {!hasMessages ? (
              <FinanceiroEmptyState
                prompts={promptSuggestions}
                onPromptClick={prompt => void sendQuestion(prompt)}
              />
            ) : (
              messages.map(message => {
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
                    {isAssistant && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[92%] space-y-3 rounded-2xl px-4 py-3",
                        isAssistant
                          ? "rounded-tl-sm border border-border bg-card shadow-sm"
                          : "rounded-tr-sm border border-primary/15 bg-primary/10"
                      )}
                    >
                      {!isAssistant && (
                        <p className="text-sm leading-[1.65] text-foreground">
                          {message.content}
                        </p>
                      )}

                      {isAssistant && message.response && (
                        <>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "gap-1 text-xs",
                                  decisionToneClass[message.response.decision.status]
                                )}
                              >
                                <ShieldAlert className="h-3 w-3" />
                                {decisionLabel[message.response.decision.status]}
                              </Badge>

                              <Badge
                                variant="outline"
                                className="border-primary/15 bg-primary/5 text-xs text-muted-foreground"
                              >
                                {confidenceLabel[message.response.confidence]}
                              </Badge>

                              <Badge
                                variant="outline"
                                className="border-border/70 bg-background/40 text-xs text-muted-foreground"
                              >
                                {formatPeriodBadge(message.response.resolvedPeriod)}
                              </Badge>

                              {message.response.compareTo && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-border/70 bg-background/40 text-xs text-muted-foreground"
                                >
                                  <ArrowRightLeft className="h-3 w-3" />
                                  {formatPeriodBadge(message.response.compareTo)}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-1">
                              <p className="text-base font-semibold leading-6 text-foreground">
                                {message.response.headline}
                              </p>
                              <p className="text-sm leading-6 text-foreground/90">
                                {message.response.decision.message}
                              </p>
                              {message.response.summary && (
                                <p className="text-xs text-muted-foreground">
                                  {message.response.summary}
                                </p>
                              )}
                            </div>
                          </div>

                          {message.response.warnings.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {message.response.warnings.map(item => (
                                <div
                                  key={`${message.id}-${item}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}

                          {message.response.narrative && (
                            <p className="text-sm leading-[1.7] text-foreground/90">
                              {message.response.narrative}
                            </p>
                          )}

                          {message.response.drivers.length > 0 && (
                            <div className="space-y-2">
                              <p className="metric-label">Drivers executivos</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {message.response.drivers.map(driver => (
                                  <div
                                    key={`${message.id}-${driver.title}`}
                                    className="rounded-xl border border-border/60 bg-background/60 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {driver.title}
                                        </p>
                                        {driver.metric && (
                                          <p className="text-xs text-muted-foreground">
                                            {driver.metric}
                                          </p>
                                        )}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px]",
                                          driver.direction === "negative"
                                            ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                                            : driver.direction === "positive"
                                              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                                              : "border-border bg-background/70 text-muted-foreground"
                                        )}
                                      >
                                        {urgencyLabel[driver.urgency]}
                                      </Badge>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-foreground/90">
                                      {driver.impact}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                      {driver.detail}
                                    </p>
                                    {driver.ownerHint && (
                                      <p className="mt-2 text-[11px] text-primary/80">
                                        Owner: {driver.ownerHint}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.response.citations.length > 0 && (
                            <div className="space-y-2">
                              <p className="metric-label">Provas</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {message.response.citations.map(item => (
                                  <div
                                    key={`${message.id}-${item.label}-${item.value}`}
                                    className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5"
                                  >
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                      {item.label}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-foreground">
                                      {item.value}
                                    </div>
                                    {item.note && (
                                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                        {item.note}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.response.actions.length > 0 && (
                            <div className="space-y-2">
                              <p className="metric-label">Próximas ações</p>
                              <div className="grid gap-2">
                                {message.response.actions.map(action => (
                                  <Button
                                    key={`${message.id}-${action.label}`}
                                    type="button"
                                    variant="outline"
                                    className="h-auto justify-between gap-3 rounded-xl border-primary/20 bg-primary/5 px-3 py-3 text-left hover:bg-primary/10"
                                    onClick={() => handleActionClick(action)}
                                  >
                                    <div className="flex min-w-0 flex-col items-start gap-1">
                                      <span className="text-sm font-medium text-foreground">
                                        {action.label}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">
                                        {urgencyLabel[action.urgency]}
                                        {action.ownerHint
                                          ? ` · Owner ${action.ownerHint}`
                                          : ""}
                                      </span>
                                    </div>
                                    {action.type === "change_month" ||
                                    action.type === "compare_months" ? (
                                      <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                                    ) : (
                                      <MessageSquareText className="h-4 w-4 shrink-0 text-primary" />
                                    )}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.response.followUpPrompts.length > 0 && (
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
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}

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

        <div className="border-t border-border bg-card/60 px-4 pt-2.5 pb-4">
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
              onChange={event => setDraft(event.target.value)}
              placeholder="Ex.: Como chegamos no total de custos deste mês?"
              className="min-h-[2.75rem] flex-1 resize-none bg-background py-2.5 text-sm leading-5"
              rows={1}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
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

function FinanceiroEmptyState({
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
        <p className="text-sm font-medium">SO executivo pronto</p>
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">
          Pergunte pela decisão prioritária, pelo que mudou, pela ponte de
          custos, pelas contas em risco ou pelo melhor plano de ação para os
          próximos 7 dias.
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

function formatPeriodBadge(period: string) {
  return new Date(`${period}-01T00:00:00Z`).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}
