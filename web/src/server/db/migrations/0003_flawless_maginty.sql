ALTER TABLE "sensors" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sensors" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sensor_readings" ALTER COLUMN "sensor_id" SET DATA TYPE text;