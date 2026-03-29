ALTER TABLE `contratos`
  ADD COLUMN `vendedor_id` varchar(128) NOT NULL DEFAULT '',
  ADD COLUMN `digitador_id` varchar(128) NOT NULL DEFAULT '',
  ADD COLUMN `produto_id` varchar(128) NOT NULL DEFAULT '',
  ADD COLUMN `tipo_operacao_id` varchar(128) NOT NULL DEFAULT '',
  ADD COLUMN `agente_lookup_id` varchar(128) NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX `idx_contratos_vendedor_id` ON `contratos` (`vendedor_id`);
--> statement-breakpoint
CREATE INDEX `idx_contratos_produto_id` ON `contratos` (`produto_id`);
