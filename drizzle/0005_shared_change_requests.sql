CREATE TABLE `shared_change_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `requester_id` text NOT NULL,
  `requester_username` text NOT NULL,
  `device_label` text NOT NULL DEFAULT '',
  `summary` text NOT NULL,
  `payload` text NOT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `reviewer_id` text,
  `reviewer_username` text,
  `review_note` text NOT NULL DEFAULT '',
  `created_at` integer NOT NULL,
  `reviewed_at` integer,
  FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_shared_change_requests_status_created` ON `shared_change_requests` (`status`,`created_at`);
