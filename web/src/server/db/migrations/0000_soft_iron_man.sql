CREATE TABLE "water_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sensor_id" text,
	"temperature" numeric(10, 2) NOT NULL,
	"ph" numeric(10, 2) NOT NULL,
	"turbidity" numeric(10, 2) NOT NULL,
	"dissolved_oxygen" numeric(10, 2) NOT NULL,
	"water_level" numeric(10, 2) NOT NULL,
	"is_anomaly" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
