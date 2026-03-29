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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(row => (
          <div
            key={row.label}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 transition-colors",
              row.active
                ? "border-emerald-500/60 bg-emerald-500/10"
                : "border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50"
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
