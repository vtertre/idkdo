CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"wisher_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_wisher_id_participants_id_fk" FOREIGN KEY ("wisher_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishes_event_id_index" ON "wishes" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "wishes_wisher_id_index" ON "wishes" USING btree ("wisher_id");