package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post extends BaseEntity {
    
    @Column(nullable = false)
    private String keycloakId;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> mediaUrls;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;
    
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostType type = PostType.TEXT;
    
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostVisibility visibility = PostVisibility.PUBLIC;
    
    @Builder.Default
    @Column
    private Integer likesCount = 0;
    
    @Builder.Default
    @Column
    private Integer commentsCount = 0;
    
    @Builder.Default
    @Column
    private Integer sharesCount = 0;
    
    @Builder.Default
    @Column
    private Boolean isPinned = false;
    
    @Builder.Default
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();
    
    @Builder.Default
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Like> likes = new ArrayList<>();
    
    public enum PostType {
        TEXT,
        IMAGE,
        VIDEO,
        ACHIEVEMENT,
        EVENT,
        TRAINING
    }
    
    public enum PostVisibility {
        PUBLIC,
        FOLLOWERS,
        PRIVATE,
        ORGANIZATION
    }
}
