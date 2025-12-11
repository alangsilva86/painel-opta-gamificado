import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "./trpc";

async function notifyOwner(): Promise<boolean> {
  // Placeholder notification handler (no external dependency)
  return true;
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async () => {
      const delivered = await notifyOwner();
      return {
        success: delivered,
      } as const;
    }),
});
