ALTER TABLE "lists" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "color" text DEFAULT 'gray' NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "icon" text;