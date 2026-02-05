#!/usr/bin/env node
/**
 * Script para inicializar o banco de dados de teste do livestream-service
 * Cria as tabelas necessárias sem depender do Prisma CLI
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/livestream_test';

const createTablesSQL = `
-- Enum para status de live
DO $$ BEGIN
  CREATE TYPE "LiveStatus" AS ENUM ('scheduled', 'live', 'finished', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela Live
CREATE TABLE IF NOT EXISTS "Live" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "external_match_id" TEXT NOT NULL UNIQUE,
  "organization_id" TEXT NOT NULL,
  "stream_key" TEXT NOT NULL,
  "status" "LiveStatus" NOT NULL DEFAULT 'scheduled',
  "started_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Live_organization_id_idx" ON "Live"("organization_id");

-- Tabela LiveEvent
CREATE TABLE IF NOT EXISTS "LiveEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "live_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveEvent_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LiveEvent_live_id_idx" ON "LiveEvent"("live_id");
CREATE INDEX IF NOT EXISTS "LiveEvent_live_id_created_at_idx" ON "LiveEvent"("live_id", "created_at");

-- Tabela GoogleCalendarToken
CREATE TABLE IF NOT EXISTS "GoogleCalendarToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "scope" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Tabela GoogleCalendarEvent
CREATE TABLE IF NOT EXISTS "GoogleCalendarEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "google_event_id" TEXT NOT NULL,
  "calendar_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "external_match_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "GoogleCalendarToken"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GoogleCalendarEvent_user_id_idx" ON "GoogleCalendarEvent"("user_id");
CREATE INDEX IF NOT EXISTS "GoogleCalendarEvent_external_match_id_idx" ON "GoogleCalendarEvent"("external_match_id");
CREATE UNIQUE INDEX IF NOT EXISTS "GoogleCalendarEvent_google_event_id_calendar_id_key" ON "GoogleCalendarEvent"("google_event_id", "calendar_id");
`;

async function setupDatabase() {
  console.log('🔧 Configurando banco de dados de teste...');
  console.log(`📍 DATABASE_URL: ${DATABASE_URL.replace(/\/\/.*@/, '//***@')}`);
  
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    await client.query(createTablesSQL);
    console.log('✅ Tabelas criadas com sucesso!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    await client.end();
    process.exit(1);
  }
}

setupDatabase();
