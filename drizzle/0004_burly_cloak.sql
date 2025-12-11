CREATE TABLE `metas_diarias` (
	`id` varchar(64) NOT NULL,
	`mes` varchar(7) NOT NULL,
	`dia` int NOT NULL,
	`vendedoraId` varchar(64) NOT NULL,
	`metaValor` varchar(20) NOT NULL,
	`tipo` enum('automatica','manual') NOT NULL DEFAULT 'automatica',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metas_diarias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metas_semanais` (
	`id` varchar(64) NOT NULL,
	`mes` varchar(7) NOT NULL,
	`semana` int NOT NULL,
	`vendedoraId` varchar(64) NOT NULL,
	`metaValor` varchar(20) NOT NULL,
	`tipo` enum('automatica','manual') NOT NULL DEFAULT 'automatica',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metas_semanais_id` PRIMARY KEY(`id`)
);
