-- =====================================================
-- Migration V1: Initial Schema (AthlosHub)
-- Data: 2026-02-04
-- Notas: Schema completo sincronizado com Entidades JPA
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
    team_id VARCHAR(255) NOT NULL UNIQUE,
    organization_slug VARCHAR(255) NOT NULL,
    description TEXT,
    followers_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    achievements_count INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    social_links JSONB,
    achievements JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Posts
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_type VARCHAR(20) NOT NULL,
    profile_id VARCHAR(255) NOT NULL,
    created_by_keycloak_id VARCHAR(255),
    type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    content TEXT NOT NULL,
    media_urls JSONB,
    visibility VARCHAR(20) DEFAULT 'PUBLIC',
    is_pinned BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT posts_profile_type_check CHECK (profile_type IN ('ATHLETE', 'ORGANIZATION', 'TEAM')),
    CONSTRAINT posts_type_check CHECK (type IN ('TEXT', 'IMAGE', 'VIDEO', 'ACHIEVEMENT', 'EVENT', 'TRAINING', 'ANNOUNCEMENT', 'SHARED')),
    CONSTRAINT posts_visibility_check CHECK (visibility IN ('PUBLIC', 'FOLLOWERS', 'PRIVATE', 'MEMBERS_ONLY'))
);

-- 5. Comments
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

-- 6. Likes
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    keycloak_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_like UNIQUE (keycloak_id, post_id)
);

-- 7. Shares
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    keycloak_id VARCHAR(255) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_share_user_post UNIQUE (keycloak_id, post_id)
);

-- 8. Follows
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_keycloak_id VARCHAR(255) NOT NULL,
    following_keycloak_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follow UNIQUE (follower_keycloak_id, following_keycloak_id)
);

-- 9. Organization Follows
CREATE TABLE IF NOT EXISTS organization_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_keycloak_id VARCHAR(255) NOT NULL,
    organization_slug VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_org_follow UNIQUE (follower_keycloak_id, organization_slug)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices de lookup principal
CREATE INDEX IF NOT EXISTS idx_athlete_keycloak ON athlete_profiles(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_org_slug ON organization_profiles(organization_slug);
CREATE INDEX IF NOT EXISTS idx_team_id ON team_profiles(team_id);

-- Índices de posts
CREATE INDEX IF NOT EXISTS idx_post_profile_lookup ON posts(profile_type, profile_id);
CREATE INDEX IF NOT EXISTS idx_post_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_created_by ON posts(created_by_keycloak_id);

-- Índices de relacionamentos
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_keycloak ON comments(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_keycloak ON likes(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_shares_post_id ON shares(post_id);
CREATE INDEX IF NOT EXISTS idx_shares_keycloak ON shares(keycloak_id);

-- Índices de follows
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_keycloak_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_keycloak_id);
CREATE INDEX IF NOT EXISTS idx_org_follows_follower ON organization_follows(follower_keycloak_id);
CREATE INDEX IF NOT EXISTS idx_org_follows_org ON organization_follows(organization_slug);

-- =====================================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE athlete_profiles IS 'Perfis de atletas sincronizados com Keycloak';
COMMENT ON TABLE organization_profiles IS 'Perfis de organizações esportivas';
COMMENT ON TABLE team_profiles IS 'Perfis de times vinculados a organizações';
COMMENT ON TABLE posts IS 'Posts do feed social (atletas, organizações e times)';
COMMENT ON TABLE comments IS 'Comentários em posts';
COMMENT ON TABLE likes IS 'Curtidas em posts';
COMMENT ON TABLE shares IS 'Compartilhamentos de posts';
COMMENT ON TABLE follows IS 'Relacionamento de seguidores entre atletas';
COMMENT ON TABLE organization_follows IS 'Relacionamento de seguidores de organizações';