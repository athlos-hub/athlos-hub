package br.com.athloshub.social_service.exception;

/**
 * Exceção lançada quando há problemas relacionados à segurança/autenticação.
 */
public class SecurityException extends RuntimeException {
    
    public SecurityException(String message) {
        super(message);
    }
    
    public SecurityException(String message, Throwable cause) {
        super(message, cause);
    }
}
