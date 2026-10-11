CREATE TYPE "public"."incident_severity" AS ENUM('HIGH', 'MED', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('reported', 'triaged', 'in_progress', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."waste_category" AS ENUM('Mixed municipal waste', 'Organic waste', 'Plastic waste', 'Construction debris', 'Hazardous waste', 'E-waste', 'Other');--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ref" varchar(16) NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"category" "waste_category" NOT NULL,
	"severity" "incident_severity" NOT NULL,
	"status" "incident_status" DEFAULT 'reported' NOT NULL,
	"location" varchar(300) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "incidents_latitude_range" CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
	CONSTRAINT "incidents_longitude_range" CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_ref_key" ON "incidents" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "incidents_status_idx" ON "incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "incidents_severity_idx" ON "incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "incidents_created_at_idx" ON "incidents" USING btree ("created_at");