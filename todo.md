# TODO - Ajustes e Melhorias Painel Gamificado

## 1. Fonte de Dados & Colunas
- [x] Adicionar campo `Valor_comissao` no zohoService
- [x] Adicionar campo `product` (lookup) no zohoService
- [x] Adicionar campo `Blueprint.Current_Stage` no zohoService
- [x] Remover exibição de `Valor_comissao` em qualquer lugar do painel

## 2. Motor de Comissão
- [x] Corrigir cálculo: usar `Valor_comissao * 0.55 * 0.06` ao invés de `amount * 0.55 * 0.06`
- [x] Atualizar calculationService com nova fórmula
- [x] Testar cálculo com dados reais

## 3. Tiers das Vendedoras
- [x] Atualizar faixas de tiers: Bronze 1-75%, Prata 75-99%, Ouro 100-124%, etc
- [x] Implementar Bronze com multiplicador 0,00x (não recebe comissão)
- [x] Atualizar cores dos tiers no frontend
- [x] Adicionar tier "Brilhante" (150-174% - 2,00x)
- [x] Ajustar tier "Diamante" (175-199% - 2,50x)
- [x] Ajustar tier "Mestre" (200-249% - 3,00x)
- [x] Ajustar tier "Lendário" (≥250% - 3,50x)

## 4. Acelerador Global (Meta & Super Meta)
- [x] Adicionar campo `superMetaValor` na tabela `metas_global`
- [x] Atualizar schema do banco com novo campo
- [x] Implementar lógica: Meta Global batida = +25%, Super Meta batida = +50%
- [x] Acelerador só para vendedoras com ≥75% da meta
- [x] Atualizar painel admin para configurar Meta e Super Meta separadamente
- [x] Atualizar dashboard para exibir ambas as metas

## 5. Metas Diárias e Semanais
- [x] Calcular automaticamente dias úteis do mês
- [x] Calcular meta diária = MetaMensal / DiasUteis
- [x] Calcular meta semanal = MetaMensal / Semanas
- [x] Adicionar campos editáveis para meta diária e semanal no admin
- [x] Exibir metas diárias e semanais no dashboard

## 6. Escada de Aceleradores
- [x] Criar componente para exibir escada (75%, 100%, 125%, 150%, 175%, 200%, 250%)
- [x] Calcular valores para cada vendedora
- [x] Adicionar tooltips "próximo nível"

## 7. Produtos & Rentabilidade
- [x] Criar endpoint para listar produtos mais vendidos
- [x] Criar endpoint para produtos mais rentáveis por vendedora
- [x] Implementar gráfico de top produtos (quantidade)
- [x] Implementar gráfico de produtos rentáveis (comissão)
- [x] Adicionar filtros por período e vendedora

## 8. Pipeline por Estágio
- [x] Consumir campo `Blueprint.Current_Stage`
- [x] Criar bloco informativo "Valor em liberação"
- [x] Exibir total por estágio
- [x] Exibir distribuição por vendedora
- [x] Deixar claro que não entra no cálculo de comissão

## 9. Badges & Tooltips
- [x] Adicionar tooltips em todas as badges de sequência
- [x] Adicionar tooltips em badges de ranking
- [x] Adicionar tooltips em badges de meta
- [x] Usar biblioteca de tooltips (ex: Radix UI Tooltip)

## 10. Gamificação Visual & Sons
- [x] Adicionar som de celebração para nova venda
- [ ] Adicionar som de conquista para meta 100%
- [x] Adicionar som de comemoração para Meta Global
- [x] Adicionar som especial para Super Meta Global
- [x] Implementar botão de mute global
- [x] Garantir que animações não travem a UI
- [x] Adicionar confetes para nova venda registrada
- [x] Adicionar animação especial para Meta Global batida
- [ ] Adicionar animação full-screen para Super Meta batida

## 11. Testes & Validação
- [ ] Testar cálculo de comissão com dados reais
- [ ] Validar que Bronze não recebe comissão
- [ ] Validar aceleradores (25% e 50%)
- [ ] Validar metas diárias e semanais
- [ ] Testar gráficos de produtos
- [ ] Testar pipeline por estágio
- [ ] Validar tooltips em todas as badges
- [ ] Testar sons e mute
