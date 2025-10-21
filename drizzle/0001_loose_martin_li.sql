CREATE TABLE `badges` (
	`id` varchar(64) NOT NULL,
	`vendedoraId` varchar(64) NOT NULL,
	`tipo` varchar(100) NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`icone` varchar(100),
	`conquistadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historico_metas` (
	`id` varchar(64) NOT NULL,
	`tipo` enum('vendedor','global') NOT NULL,
	`mes` varchar(7) NOT NULL,
	`vendedoraId` varchar(64),
	`valorAnterior` varchar(20),
	`valorNovo` varchar(20) NOT NULL,
	`alteradoPor` varchar(64) NOT NULL,
	`alteradoEm` timestamp DEFAULT (now()),
	CONSTRAINT `historico_metas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metas_global` (
	`id` varchar(64) NOT NULL,
	`mes` varchar(7) NOT NULL,
	`metaValor` varchar(20) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metas_global_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metas_vendedor` (
	`id` varchar(64) NOT NULL,
	`mes` varchar(7) NOT NULL,
	`vendedoraId` varchar(64) NOT NULL,
	`metaValor` varchar(20) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metas_vendedor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parametros_plano` (
	`id` varchar(64) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`basePct` varchar(10) NOT NULL DEFAULT '0.55',
	`pctVendedora` varchar(10) NOT NULL DEFAULT '0.06',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `parametros_plano_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendedoras` (
	`id` varchar(64) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320),
	`foto` text,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `vendedoras_id` PRIMARY KEY(`id`)
);
