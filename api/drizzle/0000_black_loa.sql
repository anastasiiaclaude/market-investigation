CREATE TABLE "competitors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"website" text NOT NULL,
	"description" text NOT NULL,
	"features" jsonb NOT NULL,
	"updated_at" text NOT NULL
);
