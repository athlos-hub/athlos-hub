-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('scheduled', 'live', 'finished', 'cancelled');

-- CreateTable
CREATE TABLE "Live" (
    "id" TEXT NOT NULL,
    "external_match_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "stream_key" TEXT NOT NULL,
    "status" "LiveStatus" NOT NULL DEFAULT 'scheduled',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Live_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Live_external_match_id_key" ON "Live"("external_match_id");
