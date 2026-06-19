CREATE TABLE "event_entry_page_projection" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
INSERT INTO "event_entry_page_projection" ("id", "name", "created_at", "updated_at")
SELECT "id", "name", "created_at", "updated_at"
FROM "events";
