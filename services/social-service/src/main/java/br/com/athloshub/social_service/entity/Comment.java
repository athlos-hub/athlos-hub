package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment extends BaseEntity {
    
    @Column(nullable = false)
    private String keycloakId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    
    @Builder.Default
    @Column
    private Integer likesCount = 0;
    
    @Builder.Default
    @Column
    private Boolean isEdited = false;
}
