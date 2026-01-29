-- CreateTable
CREATE TABLE IF NOT EXISTS "GoogleCalendarEvent" (
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
ON "GoogleCalendarEvent"("user_id", "live_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoogleCalendarEvent_userId_idx" 
ON "GoogleCalendarEvent"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoogleCalendarEvent_liveId_idx" 
ON "GoogleCalendarEvent"("live_id");

-- AddForeignKey
ALTER TABLE "GoogleCalendarEvent" 
ADD CONSTRAINT "GoogleCalendarEvent_user_id_fkey" 
FOREIGN KEY ("user_id") 
REFERENCES "GoogleCalendarToken"("user_id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;
