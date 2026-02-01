package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "athlete_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AthleteProfile extends BaseEntity {
    
    @Column(nullable = false, unique = true)
    private String keycloakId;
    
    @Column(columnDefinition = "TEXT")
    private String bio;
    
    @Column(length = 100)
    private String specialization;
    
    @Column(length = 100)
    private String city;
    
    @Column(length = 100)
    private String state;
    
    @Column(length = 100)
    private String country;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> achievements;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> statistics;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> socialLinks;
    
    @Builder.Default
    @Column
    private Integer followersCount = 0;
    
    @Builder.Default
    @Column
    private Integer followingCount = 0;
    
    @Builder.Default
    @Column
    private Integer achievementsCount = 0;
    
    @Builder.Default
    @Column
    private Boolean isVerified = false;
    
    @Column
    private LocalDateTime verifiedAt;
    
    @Builder.Default
    @Column
    private Boolean isPublic = true;
}
