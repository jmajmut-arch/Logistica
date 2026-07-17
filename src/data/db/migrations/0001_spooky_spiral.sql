CREATE TABLE `field_verification_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`verification_id` integer NOT NULL,
	`item_key` text NOT NULL,
	`result` text NOT NULL,
	`observation` text,
	FOREIGN KEY (`verification_id`) REFERENCES `field_verifications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `field_verification_items_verification_idx` ON `field_verification_items` (`verification_id`);--> statement-breakpoint
CREATE TABLE `field_verifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`zone_id` integer NOT NULL,
	`performed_by` integer NOT NULL,
	`performed_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`notes` text,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `field_verifications_zone_idx` ON `field_verifications` (`zone_id`);--> statement-breakpoint
CREATE INDEX `field_verifications_performed_at_idx` ON `field_verifications` (`performed_at`);