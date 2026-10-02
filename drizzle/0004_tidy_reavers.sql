CREATE TABLE `material_items` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_by_username` text NOT NULL,
	`updated_by_username` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_material_items_parent_id` ON `material_items` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_material_items_updated_at` ON `material_items` (`updated_at`);