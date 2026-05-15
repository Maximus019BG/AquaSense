CREATE TYPE "public"."alert_type" AS ENUM('critical', 'warning', 'info');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "alert_type" NOT NULL,
	"message" text NOT NULL,
	"parameter" text NOT NULL,
	"value" numeric,
	"threshold" numeric,
	"acknowledged" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parameter" text NOT NULL,
	"current_value" numeric,
	"predicted_value" numeric,
	"confidence" integer,
	"predicted_for" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sensors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'online',
	"last_reading" text,
	"location" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "sensor_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "temperature" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "temperature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "ph" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "ph" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "turbidity" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "turbidity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "dissolved_oxygen" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "dissolved_oxygen" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "water_level" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "water_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "water_readings" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_verified" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "water_readings" ADD CONSTRAINT "water_readings_sensor_id_sensors_id_fk" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_readings" DROP COLUMN "is_anomaly";