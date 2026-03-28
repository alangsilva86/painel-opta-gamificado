import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type GestaoResumoData = RouterOutputs["gestao"]["getResumo"];
export type GestaoTimeseriesPoint = GestaoResumoData["timeseries"][number];
export type GestaoSellerRow = GestaoResumoData["bySeller"][number];
export type GestaoProductRow = GestaoResumoData["byProduct"][number];
