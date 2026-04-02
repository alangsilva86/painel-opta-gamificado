import { useMemo, useState } from "react";
import { Bookmark, Copy, Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GestaoSavedView } from "../types";

type SavedViewsManagerProps = {
  presetViews: GestaoSavedView[];
  customViews: GestaoSavedView[];
  activeViewId?: string | null;
  onApply: (view: GestaoSavedView) => void;
  onSave: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  onRestoreLast?: () => void;
  lastViewName?: string | null;
  triggerClassName?: string;
};

export function SavedViewsManager({
  presetViews,
  customViews,
  activeViewId,
  onApply,
  onSave,
  onRename,
  onDuplicate,
  onDelete,
  onReset,
  onRestoreLast,
  lastViewName,
  triggerClassName,
}: SavedViewsManagerProps) {
  const [draftName, setDraftName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeLabel = useMemo(() => {
    const all = [...presetViews, ...customViews];
    return (
      all.find(view => view.id === activeViewId)?.name ?? "Sem vista ativa"
    );
  }, [activeViewId, customViews, presetViews]);

  const handleSubmit = () => {
    const name = draftName.trim();
    if (!name) return;
    if (editingId) {
      onRename(editingId, name);
    } else {
      onSave(name);
    }
    setDraftName("");
    setEditingId(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("min-w-0", triggerClassName)}
        >
          <Bookmark size={14} />
          <span className="truncate">{activeLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(26rem,calc(100vw-2rem))] p-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Vistas salvas</div>
              <div className="text-xs text-muted-foreground">
                Reaplique recortes executivos sem reconstruir filtros.
              </div>
            </div>
            <Badge variant="outline">{activeLabel}</Badge>
          </div>

          <div className="space-y-2">
            <div className="metric-label">Presets</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {presetViews.map(view => (
                <Button
                  key={view.id}
                  type="button"
                  variant={activeViewId === view.id ? "secondary" : "outline"}
                  className="justify-start"
                  onClick={() => onApply(view)}
                >
                  {view.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="metric-label">Personalizadas</div>
            {customViews.length === 0 && (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                Nenhuma vista personalizada salva ainda.
              </div>
            )}
            {customViews.map(view => (
              <div
                key={view.id}
                className="rounded-lg border border-border bg-muted/30 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => onApply(view)}
                  >
                    <div className="truncate text-sm font-medium">
                      {view.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Atualizada{" "}
                      {new Date(view.updatedAt).toLocaleString("pt-BR")}
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={`Renomear vista ${view.name}`}
                      onClick={() => {
                        setEditingId(view.id);
                        setDraftName(view.name);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={`Duplicar vista ${view.name}`}
                      onClick={() => onDuplicate(view.id)}
                    >
                      <Copy size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={`Excluir vista ${view.name}`}
                      onClick={() => onDelete(view.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
            <div className="metric-label">
              {editingId ? "Renomear vista" : "Salvar vista atual"}
            </div>
            <div className="flex gap-2">
              <Input
                value={draftName}
                onChange={event => setDraftName(event.target.value)}
                placeholder="Ex.: Comitê semanal"
              />
              <Button type="button" onClick={handleSubmit}>
                <Save size={14} />
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {onRestoreLast && lastViewName && (
              <Button type="button" variant="outline" onClick={onRestoreLast}>
                <RotateCcw size={14} />
                Reabrir {lastViewName}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={onReset}
            >
              Voltar ao padrão
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
