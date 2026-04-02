import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ClickableListRow = {
  label: string;
  value: string;
  extra?: string;
  onClick?: () => void;
  active?: boolean;
};

type ClickableListProps = {
  title: string;
  rows: ClickableListRow[];
};

export function ClickableList({ title, rows }: ClickableListProps) {
  return (
    <Card className="panel-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(row => (
          <button
            type="button"
            key={row.label}
            className={cn(
              "interactive-row flex w-full items-center justify-between px-3 py-2 text-left",
              row.active ? "border-emerald-500/40 bg-emerald-500/10" : ""
            )}
            onClick={row.onClick}
          >
            <div>
              <div className="text-sm font-medium">{row.label}</div>
              {row.extra && (
                <div className="text-xs text-muted-foreground">{row.extra}</div>
              )}
            </div>
            <div className="text-sm font-semibold">{row.value}</div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
