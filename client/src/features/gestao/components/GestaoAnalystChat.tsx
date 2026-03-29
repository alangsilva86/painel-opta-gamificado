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
  ChevronDown,
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

const riskLabel = {
  low: "baixo",
  medium: "moderado",
  high: "alto",
} as const;

export function GestaoAnalystChat({
  viewState,
  summary,
  availableViews,
  onAction,
}: GestaoAnalystChatProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<GestaoAnalystMessage[]>([]);
  const [contextOpen, setContextOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
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
        .find(m => m.role === "assistant" && m.response)
        ?.response ?? null,
    [messages]
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Inject context-changed system message when filters change mid-conversation
  useEffect(() => {
    if (previousSignatureRef.current === contextSignature) return;
    previousSignatureRef.current = contextSignature;
    // Close expanded context panel so user focuses on the new message
    setContextOpen(false);
    setMessages(prev =>
      prev.length === 0
        ? prev
        : [...prev, createGestaoAnalystContextUpdatedMessage(contextLabel)]
    );
  }, [contextLabel, contextSignature]);

  const promptSuggestions = latestAssistantResponse?.followUpPrompts.length
    ? latestAssistantResponse.followUpPrompts
    : GESTAO_ANALYST_INITIAL_PROMPTS;

  const hasMessages = messages.length > 0;

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
        messages: nextHistory.slice(-8).map(m => ({
          role: m.role,
          content: m.content,
        })),
        viewState,
        availableViews: availableViews.map(v => ({
          id: v.id,
          name: v.name,
          kind: v.kind,
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
      setMessages(prev => [
        ...prev,
        createGestaoAnalystMessage("system", message),
      ]);
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
      setMessages(prev => [
        ...prev,
        createGestaoAnalystMessage("system", message),
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
              <span className="text-sm font-semibold">Chat da Gestão</span>
            </span>
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-[min(100vw,44rem)] flex-col gap-0 border-border p-0 sm:max-w-[44rem]"
      >
        {/* ── Header compacto ── */}
        <SheetHeader className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <SheetTitle className="text-sm font-semibold leading-none">
              Analista IA
            </SheetTitle>
            {/* Contexto colapsável — clique no chip para expandir */}
            <button
              type="button"
              onClick={() => setContextOpen(v => !v)}
              className="mt-1 flex max-w-full items-center gap-1 text-left"
              aria-expanded={contextOpen}
              aria-label="Detalhes do contexto atual"
            >
              <span className="max-w-[22rem] truncate text-xs text-muted-foreground">
                {contextLabel}
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform",
                  contextOpen && "rotate-180"
                )}
              />
            </button>
          </div>

          <Badge
            variant="outline"
            className="shrink-0 border-primary/20 bg-primary/5 text-xs"
          >
            PT-BR
          </Badge>
        </SheetHeader>

        {/* Needed for accessibility — hidden visually */}
        <SheetDescription className="sr-only">
          Chat com o analista IA da Gestão. Contexto atual: {contextLabel}
        </SheetDescription>

        {/* ── Painel de contexto colapsável ── */}
        {contextOpen && (
          <div className="border-b border-border bg-muted/30 px-4 py-3">
            <p className="mb-2.5 text-sm leading-5 text-foreground">
              {contextLabel}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className="text-xs"
              >
                {summary.businessStatus.headline}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {summary.freshness.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {summary.dataQuality.label}
              </Badge>
            </div>
          </div>
        )}

        {/* ── Área de mensagens — foco primário ── */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 px-4 py-4">
            {!hasMessages ? (
              /* Estado vazio: compacto, integrado */
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
                const riskTone = message.response
                  ? riskToneMap[message.response.riskLevel]
                  : null;

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
                          : "rounded-tr-sm bg-primary/10 border border-primary/15"
                      )}
                    >
                      {/* Risco badge — só no assistente quando relevante */}
                      {isAssistant && message.response && riskTone && (
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-xs", riskTone.badgeClass)}
                        >
                          <ShieldAlert className="h-3 w-3" />
                          Risco {riskLabel[message.response.riskLevel]}
                        </Badge>
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
                                onClick={() => void handleActionClick(action)}
                              >
                                <ChevronRight className="mr-1 h-3 w-3 text-primary" />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Follow-ups — dentro da bolha do assistente, mais compactos */}
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
              placeholder="Ex.: Por que o take rate caiu neste período?"
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

/* ── Empty state integrado com sugestões ── */
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
        <p className="text-sm font-medium">Analista pronto para este recorte</p>
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          Pergunte sobre meta, take rate, risco, concentração ou mix — ou use
          um dos atalhos abaixo.
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
