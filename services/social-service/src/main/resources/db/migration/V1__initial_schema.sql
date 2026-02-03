-- =====================================================
-- Migration V1: Initial Schema
-- =====================================================
-- Criação das tabelas principais do social-service
-- Data: 2026-02-03
-- =====================================================

-- Tabela de perfis de atletas
CREATE TABLE IF NOT EXISTS athlete_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_id VARCHAR(255) NOT NULL UNIQUE,
    bio TEXT,
    specialization VARCHAR(255),
    city VARCHAR(255),
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

-- Tabela de perfis de organizações
CREATE TABLE IF NOT EXISTS organization_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    website VARCHAR(512),
    followers_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    social_links JSONB,
    contact_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de perfis de equipes
CREATE TABLE IF NOT EXISTS team_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    members_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    achievements_count INTEGER DEFAULT 0,
    social_links JSONB,
    achievements JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de posts
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_type VARCHAR(50) NOT NULL,
    profile_id UUID NOT NULL,
    created_by_keycloak_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT,
    media_urls JSONB,
    visibility VARCHAR(50) DEFAULT 'PUBLIC',
    is_pinned BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de comentários
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    keycloak_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Tabela de likes
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    keycloak_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT unique_like UNIQUE (post_id, keycloak_id)
);

-- Tabela de compartilhamentos
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    keycloak_id VARCHAR(255) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_share_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Tabela de seguir usuários
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_keycloak_id VARCHAR(255) NOT NULL,
    following_keycloak_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follow UNIQUE (follower_keycloak_id, following_keycloak_id)
);

-- Tabela de seguir organizações
CREATE TABLE IF NOT EXISTS organization_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_keycloak_id VARCHAR(255) NOT NULL,
    organization_slug VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_org_follow UNIQUE (follower_keycloak_id, organization_slug)
);

-- =====================================================
-- Índices para performance
-- =====================================================

-- Athlete Profiles
CREATE INDEX IF NOT EXISTS idx_athlete_keycloak ON athlete_profiles(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_athlete_verified ON athlete_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_athlete_public ON athlete_profiles(is_public);

-- Organization Profiles
CREATE INDEX IF NOT EXISTS idx_org_slug ON organization_profiles(organization_slug);

-- Team Profiles
CREATE INDEX IF NOT EXISTS idx_team_slug ON team_profiles(team_slug);

-- Posts
CREATE INDEX IF NOT EXISTS idx_post_profile ON posts(profile_type, profile_id);
CREATE INDEX IF NOT EXISTS idx_post_created_by ON posts(created_by_keycloak_id);
CREATE INDEX IF NOT EXISTS idx_post_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_visibility ON posts(visibility);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comment_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_user ON comments(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_comment_created_at ON comments(created_at DESC);

-- Likes
CREATE INDEX IF NOT EXISTS idx_like_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_like_user ON likes(keycloak_id);

-- Shares
CREATE INDEX IF NOT EXISTS idx_share_post ON shares(post_id);
CREATE INDEX IF NOT EXISTS idx_share_user ON shares(keycloak_id);

-- Follows
CREATE INDEX IF NOT EXISTS idx_follow_follower ON follows(follower_keycloak_id);
CREATE INDEX IF NOT EXISTS idx_follow_following ON follows(following_keycloak_id);

-- Organization Follows
CREATE INDEX IF NOT EXISTS idx_org_follow_follower ON organization_follows(follower_keycloak_id);
CREATE INDEX IF NOT EXISTS idx_org_follow_org ON organization_follows(organization_slug);
