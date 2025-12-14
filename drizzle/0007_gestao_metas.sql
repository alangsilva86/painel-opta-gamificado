CREATE TABLE `gestao_metas` (
  `id` varchar(64) NOT NULL,
  `mes` varchar(7) NOT NULL,
  `metaValor` varchar(32) NOT NULL,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `gestao_metas_id` PRIMARY KEY(`id`)
);
