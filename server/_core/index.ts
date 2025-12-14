import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { syncContratosGestaoMesAtualEAnterior } from "../gestao/syncService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  scheduleGestaoSync();
}

function scheduleGestaoSync() {
  if (process.env.GESTAO_SYNC_ENABLED !== "true") {
    console.log("[GestaoSync] Desabilitado (set GESTAO_SYNC_ENABLED=true para ativar)");
    return;
  }

  const minutes = Math.max(2, Number(process.env.GESTAO_SYNC_MINUTES || "3"));
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      await syncContratosGestaoMesAtualEAnterior();
    } catch (error) {
      console.error("[GestaoSync] Falha no job", error);
    } finally {
      running = false;
    }
  };

  // Run immediately on start and then on interval
  void run();
  setInterval(run, minutes * 60 * 1000);
  console.log(`[GestaoSync] Ativado: intervalo ${minutes} min (mês atual + anterior)`);
}

startServer().catch(console.error);
