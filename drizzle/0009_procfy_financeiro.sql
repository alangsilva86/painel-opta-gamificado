CREATE TABLE `procfy_transactions` (
  `id_procfy` varchar(64) NOT NULL,
  `name` varchar(512) NOT NULL DEFAULT '',
  `description` text,
  `due_date` date,
  `paid` boolean NOT NULL DEFAULT false,
  `paid_at` date,
  `competency_date` date,
  `amount_cents` int NOT NULL DEFAULT 0,
  `transaction_type` enum(
    'revenue',
    'fixed_expense',
    'variable_expense',
    'payroll',
    'tax',
    'transfer'
  ) NOT NULL,
  `payment_method` varchar(64) NOT NULL DEFAULT '',
  `category_id` varchar(64) NOT NULL DEFAULT '',
  `category_name` varchar(255) NOT NULL DEFAULT '',
  `bank_account_id` varchar(64) NOT NULL DEFAULT '',
  `bank_account_name` varchar(255) NOT NULL DEFAULT '',
  `contact_id` varchar(64) NOT NULL DEFAULT '',
  `contact_name` varchar(255) NOT NULL DEFAULT '',
  `document_number` varchar(128),
  `installment_number` int,
  `installment_total` int,
  `created_at_procfy` timestamp NULL,
  `synced_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `procfy_transactions_id_procfy` PRIMARY KEY(`id_procfy`)
);
--> statement-breakpoint
CREATE INDEX `idx_procfy_paid_at` ON `procfy_transactions` (`paid_at`);
--> statement-breakpoint
CREATE INDEX `idx_procfy_due_date` ON `procfy_transactions` (`due_date`);
--> statement-breakpoint
CREATE INDEX `idx_procfy_competency_date` ON `procfy_transactions` (`competency_date`);
--> statement-breakpoint
CREATE INDEX `idx_procfy_type_paid` ON `procfy_transactions` (`transaction_type`,`paid`);
--> statement-breakpoint
CREATE INDEX `idx_procfy_category_name` ON `procfy_transactions` (`category_name`);
--> statement-breakpoint
CREATE INDEX `idx_procfy_bank_account_name` ON `procfy_transactions` (`bank_account_name`);
--> statement-breakpoint
CREATE TABLE `procfy_sync_logs` (
  `id` varchar(64) NOT NULL,
  `range_inicio` varchar(10) NOT NULL,
  `range_fim` varchar(10) NOT NULL,
  `fetched` int NOT NULL,
  `upserted` int NOT NULL,
  `duration_ms` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `procfy_sync_logs_id` PRIMARY KEY(`id`)
);
