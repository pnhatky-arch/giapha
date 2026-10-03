CREATE TABLE `admin_notifications` (
  `id` text PRIMARY KEY NOT NULL,
  `target_user_id` text NOT NULL,
  `target_username` text NOT NULL,
  `kind` text NOT NULL,
  `title` text NOT NULL,
  `body` text NOT NULL,
  `request_id` text,
  `read_at` integer,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admin_notifications_target_created` ON `admin_notifications` (`target_user_id`,`created_at`);
