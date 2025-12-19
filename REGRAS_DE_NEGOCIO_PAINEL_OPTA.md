# Regras de Negocio - Painel Opta

## Comissao e Base Comissionavel

```
Base Comissionavel = Valor_comissao_opta * 0.55 * 0.06
Comissao Final = Base Comissionavel * (Multiplicador do Tier + Acelerador Global)
```

## Tiers e Multiplicadores

| Tier       | % Meta        | Multiplicador |
|-----------|---------------|---------------|
| Bronze    | 1-74.99%      | 0.0x          |
| Prata     | 75-99.99%     | 0.5x          |
| Ouro      | 100-124.99%   | 1.0x          |
| Platina   | 125-149.99%   | 1.5x          |
| Brilhante | 150-174.99%   | 2.0x          |
| Diamante  | 175-199.99%   | 2.5x          |
| Mestre    | 200-249.99%   | 3.0x          |
| Lendario  | >= 250%       | 3.5x          |

## Acelerador Global

- Meta Global >= 100%: +25%
- Super Meta Global >= 100%: +50%
- Nao cumulativo (super meta substitui a meta global).
- Apenas vendedoras com >= 75% da meta individual recebem acelerador.

## Regras de Exclusao

- Produtos como "Emprestimo Garantia Veiculo" nao contam para comissao/realizado das vendedoras.
- Contratos em estagios invalidos nao entram no painel (filtrados por `contractUtils.ts`).

## Metas Diarias e Semanais

- Meta diaria = Meta mensal / dias uteis do mes.
- Meta semanal = Meta mensal / semanas do mes (semanas de 1 a 5).
- Metas podem ser editadas manualmente no admin.
