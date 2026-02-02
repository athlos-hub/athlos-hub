package br.com.athloshub.social_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {
    
    @NotBlank(message = "O conteúdo do comentário é obrigatório")
    @Size(min = 1, max = 1000, message = "O comentário deve ter entre 1 e 1000 caracteres")
    private String content;
}
