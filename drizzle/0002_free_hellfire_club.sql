CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `permissions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE `users` SET `role` = 'super_admin' WHERE `id` = (SELECT `id` FROM `users` ORDER BY `created_at` ASC LIMIT 1);--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`key`, `value`, `updated_at`) VALUES
  ('project_name', 'Gia phả họ Phạm', unixepoch() * 1000),
  ('generations', '["Đời thứ 1","Đời thứ 2","Đời thứ 3","Đời thứ 4"]', unixepoch() * 1000),
  ('legends', '["Thủy tổ","Thành viên dòng họ"]', unixepoch() * 1000),
  ('menu_tabs', '["Tổng quan","Cây gia phả","Thành viên","Sự kiện","Tư liệu","Cài đặt"]', unixepoch() * 1000);--> statement-breakpoint
PRAGMA optimize;
