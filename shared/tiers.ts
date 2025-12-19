export const TIERS = [
  { min: 1, max: 74.99, multiplicador: 0.0, nome: "Bronze", emoji: "\u{1F949}", cor: "gray" },
  { min: 75, max: 99.99, multiplicador: 0.5, nome: "Prata", emoji: "\u{1F948}", cor: "silver" },
  { min: 100, max: 124.99, multiplicador: 1.0, nome: "Ouro", emoji: "\u{1F947}", cor: "gold" },
  { min: 125, max: 149.99, multiplicador: 1.5, nome: "Platina", emoji: "\u{1F48E}", cor: "blue" },
  { min: 150, max: 174.99, multiplicador: 2.0, nome: "Brilhante", emoji: "\u2728", cor: "cyan" },
  { min: 175, max: 199.99, multiplicador: 2.5, nome: "Diamante", emoji: "\u{1F537}", cor: "teal" },
  { min: 200, max: 249.99, multiplicador: 3.0, nome: "Mestre", emoji: "\u{1F451}", cor: "orange" },
  { min: 250, max: Infinity, multiplicador: 3.5, nome: "Lend\u00e1rio", emoji: "\u26A1", cor: "purple" },
] as const;

export const ESCADA_NIVEIS = [75, 100, 125, 150, 175, 200, 250] as const;

export type TierDefinition = (typeof TIERS)[number];
export type TierName = TierDefinition["nome"];
