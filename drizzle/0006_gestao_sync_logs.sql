CREATE TABLE `gestao_sync_logs` (
  `id` varchar(64) NOT NULL,
  `range_inicio` varchar(10) NOT NULL,
  `range_fim` varchar(10) NOT NULL,
  `fetched` int NOT NULL,
  `upserted` int NOT NULL,
  `unchanged` int NOT NULL,
  `skipped` int NOT NULL,
  `duration_ms` int NOT NULL,
  `warnings` text,
  `created_at` timestamp DEFAULT (now()),
  CONSTRAINT `gestao_sync_logs_id` PRIMARY KEY(`id`)
);
