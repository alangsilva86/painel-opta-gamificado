import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer ${
              row.active
                ? "border-emerald-500 bg-emerald-900/20"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
            onClick={row.onClick}
          >
            <div>
              <div className="text-sm font-medium">{row.label}</div>
              {row.extra && <div className="text-xs text-slate-400">{row.extra}</div>}
            </div>
            <div className="text-sm font-semibold">{row.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
