# Tabelas Zoho Creator - Campos Usados

## Relatorio "Contratos"

Campos esperados no payload:

- ID
- contractNumber
- Data_de_Criacao
- paymentDate
- Data_de_Pagamento
- amount
- Valor_liquido_liberado
- Valor_comissao
- Comissao
- Comissao_Bonus
- amountComission
- comissionPercent
- comissionPercentBonus
- sellerName (lookup)
- typerName (lookup)
- product (lookup)
- operationType (lookup)
- agentId (lookup)
- Blueprint.Current_Stage

Observacoes:

- A data de pagamento pode vir em `paymentDate` ou `Data_de_Pagamento`.
- A comissao base prioriza `amountComission` e `Valor_comissao`.
- O estagio vem de `Blueprint.Current_Stage`.
- A seção "Vendas do Dia" usa `Data_de_Criacao` e exclui os estágios `Cancelado`, `Não Contratado` e `Comercial`.
