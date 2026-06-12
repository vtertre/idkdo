ALTER TABLE "events" ADD COLUMN "name" text;
UPDATE "events" SET "name" = 'Untitled event' WHERE "name" IS NULL;
ALTER TABLE "events" ALTER COLUMN "name" SET NOT NULL;
