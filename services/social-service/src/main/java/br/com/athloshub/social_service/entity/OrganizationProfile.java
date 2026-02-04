package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "organization_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationProfile extends BaseEntity {
    
    @Column(nullable = false, unique = true)
    private String organizationSlug;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> socialLinks;
    
    @Builder.Default
    @Column(name = "followers_count")
    private Integer followersCount = 0;
    
    @Builder.Default
    @Column(name = "posts_count") 
    private Integer postsCount = 0;
    
    @Builder.Default
    @Column(name = "is_verified")
    private Boolean isVerified = false;
    
    @Builder.Default
    @Column(name = "is_private")
    private Boolean isPrivate = false;
}
