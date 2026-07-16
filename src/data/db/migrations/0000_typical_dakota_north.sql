CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`related_substance_id` integer,
	`related_zone_id` integer,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`resolved_at` integer,
	`resolved_by` integer,
	FOREIGN KEY (`related_substance_id`) REFERENCES `substances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `alerts_status_idx` ON `alerts` (`status`);--> statement-breakpoint
CREATE TABLE `compatibility_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_a` text NOT NULL,
	`class_b` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `compatibility_rules_pair_idx` ON `compatibility_rules` (`class_a`,`class_b`);--> statement-breakpoint
CREATE TABLE `substances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`hazard_class` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`zone_id` integer NOT NULL,
	`expiration_date` text NOT NULL,
	`sds_uri` text,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `substances_zone_idx` ON `substances` (`zone_id`);--> statement-breakpoint
CREATE INDEX `substances_expiration_idx` ON `substances` (`expiration_date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zone_class_limits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`zone_id` integer NOT NULL,
	`hazard_class` text NOT NULL,
	`max_quantity` real NOT NULL,
	`unit` text NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zone_class_limits_zone_class_idx` ON `zone_class_limits` (`zone_id`,`hazard_class`);--> statement-breakpoint
CREATE TABLE `zones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zones_code_unique` ON `zones` (`code`);