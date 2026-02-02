package br.com.athloshub.social_service.dto.response;

import br.com.athloshub.social_service.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    
    private UUID id;
    private String keycloakId;
    private String content;
    private Integer likesCount;
    private Boolean isEdited;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static CommentResponse from(Comment comment) {
        return CommentResponse.builder()
            .id(comment.getId())
            .keycloakId(comment.getKeycloakId())
            .content(comment.getContent())
            .likesCount(comment.getLikesCount())
            .isEdited(comment.getIsEdited())
            .createdAt(comment.getCreatedAt())
            .updatedAt(comment.getUpdatedAt())
            .build();
    }
}
