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
- [ ] Adicionar campo `superMetaValor` na tabela `metas_global`
- [ ] Atualizar schema do banco com novo campo
- [ ] Implementar lógica: Meta Global batida = +25%, Super Meta batida = +50%
- [ ] Acelerador só para vendedoras com ≥75% da meta
- [ ] Atualizar painel admin para configurar Meta e Super Meta separadamente
- [ ] Atualizar dashboard para exibir ambas as metas

## 5. Metas Diárias e Semanais
- [ ] Calcular automaticamente dias úteis do mês
- [ ] Calcular meta diária = MetaMensal / DiasUteis
- [ ] Calcular meta semanal = MetaMensal / Semanas
- [ ] Adicionar campos editáveis para meta diária e semanal no admin
- [ ] Exibir metas diárias e semanais no dashboard

## 6. Escada de Aceleradores
- [ ] Criar componente para exibir escada (75%, 100%, 125%, 150%, 175%, 200%, 250%)
- [ ] Calcular valores para cada vendedora
- [ ] Adicionar tooltips "próximo nível"

## 7. Produtos & Rentabilidade
- [ ] Criar endpoint para listar produtos mais vendidos
- [ ] Criar endpoint para produtos mais rentáveis por vendedora
- [ ] Implementar gráfico de top produtos (quantidade)
- [ ] Implementar gráfico de produtos rentáveis (comissão)
- [ ] Adicionar filtros por período e vendedora

## 8. Pipeline por Estágio
- [ ] Consumir campo `Blueprint.Current_Stage`
- [ ] Criar bloco informativo "Valor em liberação"
- [ ] Exibir total por estágio
- [ ] Exibir distribuição por vendedora
- [ ] Deixar claro que não entra no cálculo de comissão

## 9. Badges & Tooltips
- [ ] Adicionar tooltips em todas as badges de sequência
- [ ] Adicionar tooltips em badges de ranking
- [ ] Adicionar tooltips em badges de meta
- [ ] Usar biblioteca de tooltips (ex: Radix UI Tooltip)

## 10. Gamificação Visual & Sons
- [ ] Adicionar som de celebração para nova venda
- [ ] Adicionar som de conquista para meta 100%
- [ ] Adicionar som de comemoração para Meta Global
- [ ] Adicionar som especial para Super Meta Global
- [ ] Implementar botão de mute global
- [ ] Garantir que animações não travem a UI
- [ ] Adicionar confetes para nova venda registrada
- [ ] Adicionar animação especial para Meta Global batida
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
