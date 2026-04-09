import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../_core/trpc";

export function parseCookies(
  cookieHeader?: string | null
): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split("=");
    if (!key) return acc;
    acc[key.trim()] = decodeURIComponent(rest.join("=").trim());
    return acc;
  }, {});
}

export function hasGestaoAccess(req: unknown): boolean {
  const cookies = parseCookies((req as any)?.headers?.cookie);
  return cookies["gestao_access"] === "1";
}

export const gestaoProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!hasGestaoAccess(ctx.req)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Acesso Gestão não autorizado",
    });
  }

  return next();
});
