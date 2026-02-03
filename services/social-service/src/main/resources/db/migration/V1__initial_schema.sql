-- =====================================================
-- Migration V1: Initial Schema (AthlosHub)
-- Data: 2026-02-03
-- Notas: Sincronizada com Entidades JPA
-- =====================================================

-- 1. Athlete Profiles
CREATE TABLE IF NOT EXISTS athlete_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_id VARCHAR(255) NOT NULL UNIQUE,
    bio TEXT,
    specialization VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    is_public BOOLEAN DEFAULT TRUE,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    achievements_count INTEGER DEFAULT 0,
    social_links JSONB,
    achievements JSONB,
    statistics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Organization Profiles
CREATE TABLE IF NOT EXISTS organization_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    website VARCHAR(512),
    followers_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    social_links JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Team Profiles
CREATE TABLE IF NOT EXISTS team_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id VARCHAR(255) NOT NULL UNIQUE, -- Sincronizado com TeamProfile.java
    organization_slug VARCHAR(255),
    description TEXT,
    followers_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    social_links JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Posts
-- IMPORTANTE: profile_id mudou de UUID para VARCHAR para aceitar Keycloak IDs e Slugs
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_type VARCHAR(20) NOT NULL,
    profile_id VARCHAR(255) NOT NULL, -- UUID não serve aqui
    created_by_keycloak_id VARCHAR(255),
    type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    media_urls JSONB,
    visibility VARCHAR(20) DEFAULT 'PUBLIC',
    is_pinned BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Outras Tabelas de Relacionamento
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    keycloak_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    keycloak_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_like UNIQUE (post_id, keycloak_id)
);

CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    keycloak_id VARCHAR(255) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_share_user_post UNIQUE (keycloak_id, post_id)
);

CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_keycloak_id VARCHAR(255) NOT NULL,
    following_keycloak_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follow UNIQUE (follower_keycloak_id, following_keycloak_id)
);

CREATE TABLE IF NOT EXISTS organization_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_keycloak_id VARCHAR(255) NOT NULL,
    organization_slug VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_org_follow UNIQUE (follower_keycloak_id, organization_slug)
);

CREATE INDEX IF NOT EXISTS idx_athlete_keycloak ON athlete_profiles(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_org_slug ON organization_profiles(organization_slug);
CREATE INDEX IF NOT EXISTS idx_team_id ON team_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_post_profile_lookup ON posts(profile_type, profile_id);
CREATE INDEX IF NOT EXISTS idx_post_created_at ON posts(created_at DESC);