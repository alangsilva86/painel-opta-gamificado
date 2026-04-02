import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="page-shell flex min-h-screen w-full items-center justify-center px-4">
      <Card className="panel-card-strong w-full max-w-lg">
        <CardContent className="pb-8 pt-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/15 animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-destructive" />
            </div>
          </div>

          <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>

          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Página não encontrada
          </h2>

          <p className="mb-8 leading-relaxed text-muted-foreground">
            A rota que você tentou acessar não existe ou foi movida.
            <br />
            Volte ao painel principal para continuar.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button onClick={handleGoHome} className="rounded-xl px-6 py-2.5">
              <Home className="w-4 h-4 mr-2" />
              Ir para o dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
