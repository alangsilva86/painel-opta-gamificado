# 📊 Guia do Usuário - Painel de Vendas Gamificado Opta

## 🎯 Visão Geral

O Painel de Vendas Gamificado Opta é uma aplicação web em tempo real que consome dados do Zoho Creator e apresenta informações de vendas de forma visual e motivadora, utilizando elementos de gamificação para engajar a equipe.

## 🚀 Funcionalidades Principais

### 1. Dashboard Principal (`/`)

**Características:**
- **Atualização automática** a cada 60 segundos
- **KPIs globais** em destaque:
  - Realizado Global
  - % da Meta
  - Acelerador Global (+25% ou +50%)
  - Total de Contratos
- **Cards de vendedoras** com:
  - Anéis de progresso animados
  - Badges de tier (Bronze 0.5x até Lendário 3.5x)
  - Fitas de "META ALCANÇADA" para quem passou de 100%
  - Troféus de ranking (#1, #2, #3)
  - Estatísticas detalhadas
  - Badges de conquistas
- **Ranking do mês** com top 10
- **Banner de acelerador global** quando ativo
- **Celebrações automáticas** com confete quando metas são atingidas

### 2. Modo TV (`/tv`)

**Ideal para exibição em monitores e TVs**

**Características:**
- Interface otimizada para visualização à distância
- Fonte maior e cores de alto contraste
- **Alternância automática** entre duas visões a cada 15 segundos:
  - **Visão Overview**: Top 6 vendedoras com cards grandes
  - **Visão Ranking**: Ranking completo em lista
- Atualização automática a cada 30 segundos
- KPIs globais sempre visíveis no topo
- Banner de acelerador global em destaque

**Como usar:**
1. Acesse `/tv` no navegador
2. Pressione F11 para entrar em tela cheia
3. Deixe rodando em um monitor/TV

### 3. Painel Administrativo (`/admin`)

**Requer autenticação**

**Funcionalidades:**
- **Configurar Meta Global** do mês
- **Configurar Metas Individuais** por vendedora
- **Criar novas vendedoras**
- **Visualizar histórico** de alterações de metas com auditoria completa

**Como usar:**
1. Faça login no sistema
2. Acesse `/admin`
3. Configure as metas desejadas
4. Clique em "Salvar" para cada alteração

## 🎮 Sistema de Gamificação

### Tiers e Multiplicadores

O sistema possui 8 tiers baseados no percentual da meta alcançado:

| Tier | % da Meta | Multiplicador | Cor |
|------|-----------|---------------|-----|
| Sem comissão | 0-74.99% | 0.00x | Cinza |
| Bronze | 75-99.99% | 0.50x | Laranja |
| Prata | 100-124.99% | 1.00x | Prata |
| Ouro | 125-149.99% | 1.50x | Dourado |
| Platina | 150-174.99% | 2.00x | Ciano |
| Diamante | 175-199.99% | 2.50x | Azul |
| Mestre | 200-249.99% | 3.00x | Roxo |
| Lendário | ≥250% | 3.50x | Rosa |

### Acelerador Global

Bônus adicional quando a equipe atinge metas coletivas:

- **≥75% da meta global**: +0.25 (25% extra)
- **≥100% da meta global**: +0.50 (50% extra)

**Fórmula da comissão final:**
```
Comissão Final = Comissão Base × (Multiplicador Individual + Acelerador Global)
```

### Badges e Conquistas

- **Meta 100%**: Alcançou 100% da meta
- **Supermeta 150%**: Alcançou 150% da meta
- **Hat-trick**: 3 ou mais contratos no mês
- **Imparável**: 5 ou mais contratos no mês
- **Lendário**: Alcançou tier Lendário (≥250%)

### Celebrações Automáticas

O sistema dispara celebrações visuais (confete) automaticamente quando:
- **Meta global atinge 100%**: Confete verde
- **Meta global atinge 150%**: Confete dourado intenso
- **Vendedora sobe de tier**: Confete roxo

## 🔧 Configuração Técnica

### Integração com Zoho Creator

O painel consome dados diretamente da API do Zoho Creator. Para configurar:

1. **Obtenha as credenciais OAuth2** no Zoho Creator:
   - Client ID
   - Client Secret
   - Refresh Token

2. **Configure as variáveis de ambiente** (já configuradas via interface):
   - `ZOHO_CLIENT_ID`
   - `ZOHO_CLIENT_SECRET`
   - `ZOHO_REFRESH_TOKEN`

3. **Estrutura esperada do relatório "Contratos"** no Zoho:
   - `ID`
   - `Numero_do_Contrato`
   - `Status`
   - `Data_de_Criacao`
   - `Data_de_Pagamento`
   - `Valor_liquido_liberado`
   - `Valor_comissao`
   - `Vendedor` (lookup)
   - `Produto` (lookup)
   - `Corban` (lookup)
   - `Blueprint.Current_Stage` (para identificar cancelados/estágios inválidos)

### Modo Demonstração

Quando as credenciais do Zoho não estão configuradas, o sistema automaticamente usa **dados mock** para demonstração. Isso permite:
- Testar a interface completa
- Treinar a equipe
- Fazer apresentações

Para desativar o modo demo e usar dados reais, basta configurar as credenciais do Zoho.

## 📊 Cálculos de Comissão

### Fórmulas

1. **Base Comissionável**:
   ```
   Base = Valor_comissao × 0.55
   ```

2. **Comissão Vendedora**:
   ```
   Comissão Base = Base × 0.06
   ```

3. **Comissão Final**:
   ```
   Comissão Final = Comissão Base × (Multiplicador + Acelerador Global)
   ```

### Exemplo Prático

**Contrato:**
- Valor líquido liberado: R$ 20.000
- Valor comissão: R$ 1.600

**Vendedora:**
- Meta mensal: R$ 100.000
- Realizado: R$ 130.000 (130% da meta → Tier Ouro 1.5x)

**Equipe:**
- Meta global: R$ 600.000
- Realizado: R$ 650.000 (108% → Acelerador +0.50)

**Cálculo:**
```
Base = 1.600 × 0.55 = R$ 880
Comissão Base = 880 × 0.06 = R$ 52,80
Comissão Final = 52,80 × (1.5 + 0.5) = R$ 105,60
```

## 🗄️ Banco de Dados

### Tabelas Principais

1. **vendedoras**: Cadastro de vendedoras
2. **metas_vendedor**: Metas mensais individuais
3. **metas_global**: Meta mensal da equipe
4. **badges**: Conquistas das vendedoras
5. **historico_metas**: Auditoria de alterações

### Seed de Dados

Para popular o banco com dados de exemplo:

```bash
cd /home/ubuntu/painel-opta-gamificado
npx tsx scripts/seed.ts
```

Isso cria:
- 6 vendedoras de exemplo
- Metas individuais para o mês atual
- Meta global para o mês atual

## 🎨 Personalização

### Cores e Tema

O painel usa um tema dark com cores personalizáveis em `client/src/index.css`:

- **Primary**: Roxo/Azul (`oklch(0.65 0.25 265)`)
- **Background**: Azul escuro (`oklch(0.12 0.02 265)`)
- **Cards**: Azul médio (`oklch(0.16 0.02 265)`)

### Parâmetros de Comissionamento

Os percentuais podem ser ajustados em `server/calculationService.ts`:

```typescript
const PARAMETROS = {
  BASE_PCT: 0.55,        // 55% do valor de comissão
  PCT_VENDEDORA: 0.06,   // 6% da base comissionável
};
```

### Tiers

A tabela de tiers pode ser modificada em `server/calculationService.ts`:

```typescript
const TIERS = [
  { min: 0, max: 74.99, multiplicador: 0.0, nome: "Sem comissão" },
  { min: 75, max: 99.99, multiplicador: 0.5, nome: "Bronze" },
  // ... adicione ou modifique conforme necessário
];
```

## 🔒 Segurança

- **Sessão local**: cookies assinados com `JWT_SECRET`
- **Rotas protegidas**: `/admin` requer sessão ativa
- **Auditoria**: Todas as alterações de metas são registradas com usuário e timestamp
- **Credenciais**: Zoho credentials armazenadas como variáveis de ambiente (nunca no código)

## 📱 Responsividade

O painel é totalmente responsivo:
- **Desktop**: Layout em grid com 2 colunas
- **Tablet**: Layout adaptativo
- **Mobile**: Layout em coluna única

## 🚀 Deploy

O painel está pronto para deploy. Para publicar:

1. Faça o build (`pnpm build`) e publique em sua infraestrutura (VPS ou PaaS de sua escolha)
2. Configure domínio e SSL conforme o provedor escolhido
3. O sistema estará pronto para produção após apontar as variáveis de ambiente

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique os logs do servidor
- Consulte a documentação do Zoho Creator API
- Entre em contato com o suporte técnico

## 🎯 Próximos Passos Sugeridos

1. **Configurar credenciais reais do Zoho** para consumir dados ao vivo
2. **Definir metas do mês** via painel administrativo
3. **Testar em TV/monitor** usando o Modo TV
4. **Treinar equipe** sobre o sistema de gamificação
5. **Acompanhar métricas** de engajamento e resultados

---

**Versão**: 1.0.0  
**Última atualização**: Outubro 2025
