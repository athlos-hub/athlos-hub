package br.com.athloshub.social_service.client;

import feign.Response;
import feign.codec.ErrorDecoder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CompetitionsServiceErrorDecoder implements ErrorDecoder {
    
    private final ErrorDecoder defaultErrorDecoder = new Default();
    
    @Override
    public Exception decode(String methodKey, Response response) {
        HttpStatus status = HttpStatus.valueOf(response.status());
        
        return switch (status) {
            case NOT_FOUND -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Recurso não encontrado no competitions-service"
            );
            case UNAUTHORIZED -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Não autorizado no competitions-service"
            );
            case FORBIDDEN -> new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Acesso negado no competitions-service"
            );
            case SERVICE_UNAVAILABLE -> new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Competitions-service indisponível"
            );
            default -> defaultErrorDecoder.decode(methodKey, response);
        };
    }
}
