-- CreateTable
CREATE TABLE "LiveEvent" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveEvent_live_id_idx" ON "LiveEvent"("live_id");

-- CreateIndex
CREATE INDEX "LiveEvent_live_id_created_at_idx" ON "LiveEvent"("live_id", "created_at");

-- AddForeignKey
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE;
