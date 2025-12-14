CREATE TABLE `contratos` (
	`id_contrato` varchar(128) NOT NULL,
	`numero_contrato` varchar(128) NOT NULL DEFAULT '',
	`data_pagamento` timestamp NOT NULL,
	`liquido_liberado_cent` int NOT NULL DEFAULT 0,
	`comissao_base_cent` int NOT NULL DEFAULT 0,
	`comissao_bonus_cent` int NOT NULL DEFAULT 0,
	`comissao_total_cent` int NOT NULL DEFAULT 0,
	`pct_comissao_base` decimal(10,6) NOT NULL DEFAULT '0',
	`pct_comissao_bonus` decimal(10,6) NOT NULL DEFAULT '0',
	`vendedor_nome` varchar(255) NOT NULL DEFAULT 'Sem info',
	`digitador_nome` varchar(255) NOT NULL DEFAULT 'Sem info',
	`produto` varchar(255) NOT NULL DEFAULT 'Sem info',
	`tipo_operacao` varchar(255) NOT NULL DEFAULT 'Sem info',
	`agente_id` varchar(255) NOT NULL DEFAULT 'Sem info',
	`etapa_pipeline` varchar(255) NOT NULL DEFAULT 'Sem info',
	`inconsistencia_data_pagamento` boolean NOT NULL DEFAULT false,
	`liquido_fallback` boolean NOT NULL DEFAULT false,
	`comissao_calculada` boolean NOT NULL DEFAULT false,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contratos_id_contrato` PRIMARY KEY(`id_contrato`)
);
--> statement-breakpoint
CREATE TABLE `zoho_contratos_snapshot` (
	`id_contrato` varchar(128) NOT NULL,
	`payload_raw` text NOT NULL,
	`source_hash` varchar(128) NOT NULL,
	`fetched_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zoho_contratos_snapshot_id_contrato` PRIMARY KEY(`id_contrato`)
);
--> statement-breakpoint
CREATE INDEX `idx_contratos_data_pagamento` ON `contratos` (`data_pagamento`);--> statement-breakpoint
CREATE INDEX `idx_contratos_vendedor_nome` ON `contratos` (`vendedor_nome`);--> statement-breakpoint
CREATE INDEX `idx_contratos_etapa_pipeline` ON `contratos` (`etapa_pipeline`);--> statement-breakpoint
CREATE INDEX `idx_contratos_produto` ON `contratos` (`produto`);--> statement-breakpoint
CREATE INDEX `idx_contratos_tipo_operacao` ON `contratos` (`tipo_operacao`);--> statement-breakpoint
CREATE INDEX `idx_contratos_agente` ON `contratos` (`agente_id`);--> statement-breakpoint
CREATE INDEX `idx_contratos_data_etapa` ON `contratos` (`data_pagamento`,`etapa_pipeline`);--> statement-breakpoint
CREATE INDEX `idx_contratos_data_vendedor` ON `contratos` (`data_pagamento`,`vendedor_nome`);