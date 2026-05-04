CREATE TABLE `metas_calendario_dias` (
  `id` varchar(64) NOT NULL,
  `mes` varchar(7) NOT NULL,
  `dia` int NOT NULL,
  `diaUtil` boolean NOT NULL DEFAULT true,
  `tipo` enum('automatica','manual') NOT NULL DEFAULT 'automatica',
  `createdAt` timestamp DEFAULT (now()),
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `metas_calendario_dias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `metas_diarias`
  ADD COLUMN `percentualMeta` varchar(20) NOT NULL DEFAULT '0';
