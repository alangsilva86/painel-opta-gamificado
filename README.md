# 🎮 Painel de Vendas Gamificado Opta

Um painel de vendas moderno e gamificado que consome dados do Zoho Creator, com dashboard em tempo real e uma camada materializada de Gestão para análise executiva, comparações e drilldown.

## ✨ Características Principais

### 📊 Dashboard Gamificado
- **KPIs Globais em Tempo Real**: Realizado, % da Meta, Acelerador Global, Total de Contratos
- **Cards de Vendedoras Animados**: Com anéis de progresso, badges de conquistas e troféus de ranking
- **Sistema de Tiers**: Bronze (0x) até Lendário (3.5x) com multiplicadores de comissão
- **Celebrações Visuais**: Confete automático quando metas são atingidas
- **Atualização Automática**: A cada 60 segundos com dados do Zoho Creator

### 🎯 Painel Administrativo
- **Meta Global e Super Meta**: Configuração separada com aceleradores (+25% e +50%)
- **Metas por Vendedora**: Edição individual com histórico de alterações
- **Metas Diárias/Semanais**: Calendário interativo com cálculo automático de dias úteis
- **Gerenciamento de Visibilidade**: Ocultar/mostrar vendedoras (gerentes, ex-funcionários, operacionais)
- **Auditoria Completa**: Histórico de todas as alterações com timestamps

### 📈 Análise de Dados
- **Gráficos de Produtos**: Produtos mais vendidos e mais rentáveis com tabelas detalhadas
- **Pipeline por Estágio**: Visão operacional separada da produção monetizada
- **Gestão Materializada**: Snapshot normalizado para recortes, comparações, alertas e exportação
- **Modo TV**: Fullscreen para exibição em monitores com carrossel automático

### 🏆 Gamificação
- **Badges e Conquistas**: Meta 100%, Supermeta 150%, Hat-trick, Imparável, Streaks
- **Ranking Dinâmico**: Top 6 vendedoras com troféus (🥇 🥈 🥉)
- **Sistema de Progressão**: Tiers com cores e multiplicadores visuais

## 🛠️ Stack Técnico

### Frontend
- **React 19** com TypeScript
- **Tailwind CSS 4** para estilização
- **Framer Motion** para animações
- **Recharts** para gráficos
- **shadcn/ui** para componentes

### Backend
- **Node.js + Express**
- **tRPC 11** para procedures type-safe
- **Drizzle ORM** para banco de dados
- **MySQL/TiDB** para persistência
- **OAuth 2.0** para autenticação

### Integrações
- **Zoho Creator API v2.1** para consumo de contratos
- **Zoho Analytics** para relatórios complexos

## 🚀 Como Começar

### Pré-requisitos
- Node.js 22+
- pnpm (ou npm/yarn)
- Credenciais do Zoho Creator (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN)

### Instalação

```bash
# Clonar repositório
git clone https://github.com/alangsilva86/painel-opta-gamificado.git
cd painel-opta-gamificado

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Aplicar migrações do banco
pnpm db:push

# Iniciar servidor de desenvolvimento
pnpm dev
```

### Variáveis de Ambiente Obrigatórias

```env
# Zoho Creator
ZOHO_CLIENT_ID=seu_client_id
ZOHO_CLIENT_SECRET=seu_client_secret
ZOHO_REFRESH_TOKEN=seu_refresh_token

# Banco de Dados
DATABASE_URL=mysql://user:password@host:port/database

# Sessão local
JWT_SECRET=sua_chave_secreta_jwt

# Aplicação
VITE_APP_TITLE="Painel de Vendas Opta"
VITE_APP_LOGO=https://seu-logo.png
```

## 📁 Estrutura do Projeto

```
painel-opta-gamificado/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/            # Páginas (Dashboard, Admin, TVMode)
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilitários
│   │   └── App.tsx           # Roteamento principal
│   └── public/               # Assets estáticos
├── server/                    # Backend Node.js
│   ├── zohoService.ts        # Integração Zoho Creator
│   ├── calculationService.ts # Cálculos de comissão e tiers
│   ├── metasService.ts       # Gerenciamento de metas
│   ├── produtosService.ts    # Análise de produtos
│   ├── dashboardRouter.ts    # Endpoints tRPC
│   └── db.ts                 # Helpers de banco de dados
├── drizzle/                  # Migrations e schema
│   └── schema.ts             # Definição das tabelas
├── shared/                   # Código compartilhado
└── storage/                  # S3 helpers
```

## 🔄 Fluxo de Dados

```text
Dashboard / TV (tempo real)
Zoho Creator API
       ↓
zohoService
       ↓
calculationService
       ↓
dashboardRouter
       ↓
Frontend

Gestão (camada materializada)
Zoho Creator API
       ↓
normalizeZoho + snapshot
       ↓
tabela contratos
       ↓
resumoSnapshot / gestaoRouter
       ↓
Frontend
```

## 📊 Cálculo de Comissão

```
Base Vendedora = Valor_comissao (ou fallback Comissao) × 0.55 × 0.06

Comissão Base = Base Vendedora × Multiplicador_Tier

Comissão Final = Comissão Base × (1 + Acelerador Global)

Tiers:
- Bronze (1-74,99%): 0,00x (sem comissão)
- Prata (75-99,99%): 0,50x
- Ouro (100-124,99%): 1,00x
- Platina (125-149,99%): 1,50x
- Brilhante (150-174,99%): 2,00x
- Diamante (175-199,99%): 2,50x
- Mestre (200-249,99%): 3,00x
- Lendário (≥250%): 3,50x
```

## 🎯 Metas e Aceleradores

### Meta Global
- Define o alvo mensal para toda a equipe
- Quando atingida: +25% de acelerador para vendedoras com pelo menos 75% da meta individual

### Super Meta
- Define um alvo superior (geralmente 150% da Meta Global)
- Quando atingida: +50% de acelerador para vendedoras com pelo menos 75% da meta individual
- Não é cumulativa com a Meta Global: substitui o +25%

### Metas Diárias/Semanais
- Calculadas automaticamente dividindo meta mensal por dias úteis
- Podem ser editadas manualmente
- Ajudam a acompanhar progresso intra-mês

### Gestão
- A tela `/gestao` usa dados normalizados em banco para comparações, alertas e exportações
- A meta executiva do recorte é proporcional aos dias cobertos em cada mês filtrado
- Após migrar a tabela `contratos`, ressincronize o mês atual e o anterior para preencher os novos IDs dimensionais

## 📱 Responsividade

- **Mobile**: 1 coluna, otimizado para toque
- **Tablet**: 2 colunas, layout equilibrado
- **Desktop**: 3 colunas, visualização completa
- **4K**: 4 colunas com max-width

## ♿ Acessibilidade

- WCAG AA compliant
- Suporte a navegação por teclado
- Contraste mínimo 4.5:1
- Tooltips em todos os badges
- Descrições de imagens

## 🔐 Segurança

- OAuth 2.0 para autenticação
- JWT para sessões
- Rate limiting (50 req/min por IP)
- Validação de entrada com Zod
- HTTPS em produção

## 📈 Performance

- Lazy loading de componentes
- Virtualização de listas grandes
- Caching de dados Zoho
- Compressão de assets
- FCP < 1.5s, LCP < 2.5s

## 🐛 Troubleshooting

### "Too many requests" do Zoho
- Aguarde 5-15 minutos para rate limit expirar
- Sistema implementa retry automático com backoff exponencial

### Dados não aparecem
- Verifique se há contratos com `paymentDate` preenchido no Zoho
- Confirme credenciais do Zoho Creator

### Erro de banco de dados
- Execute `pnpm db:push` para sincronizar schema
- Verifique DATABASE_URL

## 📝 Documentação Adicional

- [Regras de Negócio](./REGRAS_DE_NEGOCIO_PAINEL_OPTA.md)
- [Tabelas Zoho Creator](./TABELAS_ZOHO_CREATOR.md)
- [Análise UX/UI](./ANALISE_UX_UI_REFINAMENTOS.md)

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](./LICENSE) para detalhes.

## 👨‍💼 Autor

**Alan da Silva**
- GitHub: [@alangsilva86](https://github.com/alangsilva86)
- Email: alangsilva86@gmail.com

## 🎉 Agradecimentos

- Zoho Creator pela API robusta
- Comunidade React e TypeScript
- shadcn/ui pelos componentes excelentes

---

**Desenvolvido com ❤️ para maximizar vendas e engajar equipes através da gamificação.**
