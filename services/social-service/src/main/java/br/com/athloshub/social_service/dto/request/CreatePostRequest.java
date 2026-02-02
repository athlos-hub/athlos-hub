package br.com.athloshub.social_service.dto.request;

import br.com.athloshub.social_service.entity.Post;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePostRequest {
    
    @NotBlank(message = "Conteúdo não pode estar vazio")
    private String content;
    
    private List<String> mediaUrls;
    
    private Post.PostType type;
    
    private Post.PostVisibility visibility;
    
    private Map<String, Object> metadata;
}
