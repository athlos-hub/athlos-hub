package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "team_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamProfile extends BaseEntity {
    
    @Column(nullable = false, unique = true)
    private String teamId;
    
    @Column(nullable = false)
    private String organizationSlug;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> socialLinks;
    
    @Builder.Default
    @Column
    private Integer followersCount = 0;
    
    @Builder.Default
    @Column
    private Integer postsCount = 0;
    
    @Builder.Default
    @Column
    private Boolean isPrivate = false;
}
