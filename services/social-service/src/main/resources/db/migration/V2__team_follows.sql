-- Team Follows: usuários seguindo equipes (clubes)
CREATE TABLE IF NOT EXISTS team_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_keycloak_id VARCHAR(255) NOT NULL,
    team_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_team_follow UNIQUE (follower_keycloak_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_follows_follower ON team_follows(follower_keycloak_id);
CREATE INDEX IF NOT EXISTS idx_team_follows_team ON team_follows(team_id);

COMMENT ON TABLE team_follows IS 'Relacionamento de seguidores de equipes (clubes)';
