-- CreateTable
CREATE TABLE IF NOT EXISTS "livestream_schema"."GoogleCalendarEvent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "html_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoogleCalendarEvent_userId_liveId_key" 
ON "livestream_schema"."GoogleCalendarEvent"("user_id", "live_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoogleCalendarEvent_userId_idx" 
ON "livestream_schema"."GoogleCalendarEvent"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoogleCalendarEvent_liveId_idx" 
ON "livestream_schema"."GoogleCalendarEvent"("live_id");

-- AddForeignKey
ALTER TABLE "livestream_schema"."GoogleCalendarEvent" 
ADD CONSTRAINT "GoogleCalendarEvent_user_id_fkey" 
FOREIGN KEY ("user_id") 
REFERENCES "livestream_schema"."GoogleCalendarToken"("user_id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;
