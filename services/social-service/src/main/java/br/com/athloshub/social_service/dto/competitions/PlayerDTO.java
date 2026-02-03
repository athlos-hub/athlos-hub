package br.com.athloshub.social_service.dto.competitions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlayerDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private UUID id;
    private UUID teamId;
    private UUID userId;
}
