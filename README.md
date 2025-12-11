# 🎮 Painel de Vendas Gamificado Opta

Um painel de vendas moderno e gamificado que consome dados em tempo real do Zoho Creator, apresentando visualizações interativas, sistema de tiers, metas diárias/semanais e análise de produtos e pipeline.

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
- **Pipeline por Estágio**: Visualização de contratos em diferentes estágios
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

# Autenticação
JWT_SECRET=sua_chave_secreta_jwt
VITE_APP_ID=seu_app_id_manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

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

```
Zoho Creator API
       ↓
zohoService (buscar contratos)
       ↓
calculationService (calcular comissão, tiers)
       ↓
dashboardRouter (endpoints tRPC)
       ↓
Frontend (React components)
       ↓
Dashboard (visualização em tempo real)
```

## 📊 Cálculo de Comissão

```
Base Comissionável = Valor_comissao × 0.55 × 0.06

Comissão Final = Base Comissionável × Multiplicador_Tier

Tiers:
- Bronze (1-75%): 0,00x (sem comissão)
- Prata (75-99%): 0,50x
- Ouro (100-124%): 1,00x
- Platina (125-149%): 1,50x
- Brilhante (150-174%): 2,00x
- Diamante (175-199%): 2,50x
- Mestre (200-249%): 3,00x
- Lendário (≥250%): 3,50x
```

## 🎯 Metas e Aceleradores

### Meta Global
- Define o alvo mensal para toda a equipe
- Quando atingida: +25% de acelerador em todas as comissões

### Super Meta
- Define um alvo superior (geralmente 150% da Meta Global)
- Quando atingida: +50% de acelerador em todas as comissões

### Metas Diárias/Semanais
- Calculadas automaticamente dividindo meta mensal por dias úteis
- Podem ser editadas manualmente
- Ajudam a acompanhar progresso intra-mês

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
