# DTOs (Data Transfer Objects)

Estruturas de dados para comunicação entre camadas e serviços.

## 📦 Estrutura

```
dto/
├── auth/              # DTOs do auth-service
│   ├── UserDTO.java
│   └── OrganizationDTO.java
└── response/          # DTOs de resposta genéricos
    ├── ApiResponse.java
    ├── PageResponse.java
    └── ErrorResponse.java
```

## 📋 DTOs Disponíveis

### Auth DTOs

#### **UserDTO**
Espelha o `UserPublic` do auth-service (Python/FastAPI).

```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "avatarUrl": "string"
}
```

**Métodos úteis:**
- `getFullName()`: Retorna nome completo (firstName + lastName)
- `getInitials()`: Retorna iniciais para avatar (ex: "JD" para John Doe)

#### **OrganizationDTO**
Espelha o `OrganizationResponse` do auth-service.

```json
{
  "id": "uuid",
  "slug": "string",
  "name": "string",
  "description": "string",
  "logoUrl": "string",
  "privacy": "PUBLIC | PRIVATE | RESTRICTED",
  "ownerId": "uuid",
  "status": "PENDING | ACTIVE | SUSPENDED",
  "joinPolicy": "REQUEST_ONLY | OPEN | INVITE_ONLY",
  "role": "OWNER | ORGANIZER | MEMBER",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

**Métodos úteis:**
- `isOwner()`: Verifica se é proprietário
- `isAdmin()`: Verifica se é owner ou organizer
- `isMember()`: Verifica se tem alguma role

---

### Response DTOs

#### **ApiResponse<T>**
Wrapper genérico para respostas padronizadas.

```json
{
  "success": true,
  "message": "Operação realizada com sucesso",
  "data": { ... },
  "timestamp": "2026-02-01T15:40:00",
  "errorCode": null,
  "errorDetails": null
}
```

**Factory methods:**
```java
// Sucesso com dados
ApiResponse.success(data);
ApiResponse.success(data, "Mensagem");
ApiResponse.success("Mensagem apenas");

// Erro
ApiResponse.error("Mensagem de erro");
ApiResponse.error("Mensagem", "ERROR_CODE");
ApiResponse.error("Mensagem", "CODE", detalhes);
```

#### **PageResponse<T>**
Resposta paginada genérica.

```json
{
  "items": [...],
  "totalItems": 100,
  "totalPages": 10,
  "currentPage": 0,
  "pageSize": 10,
  "hasNext": true,
  "hasPrevious": false
}
```

**Factory methods:**
```java
// Criar resposta paginada
PageResponse.of(items, totalItems, currentPage, pageSize);

// Criar resposta vazia
PageResponse.empty(currentPage, pageSize);
```

**Métodos úteis:**
- `isFirst()`: Verifica se é a primeira página
- `isLast()`: Verifica se é a última página

#### **ErrorResponse**
Resposta detalhada para erros.

```json
{
  "timestamp": "2026-02-01T15:40:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Erro de validação",
  "errorCode": "VALIDATION_ERROR",
  "path": "/api/social/posts",
  "method": "POST",
  "fieldErrors": {
    "title": ["Campo obrigatório", "Deve ter no mínimo 3 caracteres"]
  },
  "details": null,
  "trace": "..." // Apenas em dev
}
```

**Factory methods:**
```java
ErrorResponse.of(status, error, message, path);
ErrorResponse.of(status, error, message, errorCode, path);
```

---

## 🎯 Uso nos Controllers

### Retornar sucesso com dados
```java
@GetMapping("/users/{id}")
public ResponseEntity<ApiResponse<UserDTO>> getUser(@PathVariable UUID id) {
    UserDTO user = userService.findById(id);
    return ResponseEntity.ok(ApiResponse.success(user));
}
```

### Retornar lista paginada
```java
@GetMapping("/posts")
public ResponseEntity<PageResponse<PostDTO>> listPosts(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
) {
    Page<Post> posts = postService.findAll(PageRequest.of(page, size));
    
    List<PostDTO> items = posts.getContent().stream()
        .map(postMapper::toDTO)
        .toList();
    
    PageResponse<PostDTO> response = PageResponse.of(
        items,
        posts.getTotalElements(),
        page,
        size
    );
    
    return ResponseEntity.ok(response);
}
```

### Retornar erro customizado
```java
@GetMapping("/posts/{id}")
public ResponseEntity<ApiResponse<PostDTO>> getPost(@PathVariable UUID id) {
    return postService.findById(id)
        .map(post -> ResponseEntity.ok(ApiResponse.success(post)))
        .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error("Post não encontrado", "POST_NOT_FOUND")));
}
```

---

## 🔄 Integração com Auth-Service

Os DTOs em `dto/auth/` são **espelhos** das estruturas do auth-service (Python/FastAPI).

### Compatibilidade
- ✅ **UserDTO** → `UserPublic` (Pydantic)
- ✅ **OrganizationDTO** → `OrganizationResponse` (Pydantic)

### Convenções de Nomenclatura
- Python usa `snake_case` → Java usa `camelCase`
- `firstName` (Java) ← `first_name` (Python)
- `avatarUrl` (Java) ← `avatar_url` (Python)
- Jackson faz a conversão automaticamente

### Exemplo de Integração
```java
// Feign Client (será criado no próximo commit)
@FeignClient(name = "auth-service")
public interface AuthServiceClient {
    
    @GetMapping("/api/users/{userId}")
    UserDTO getUserById(@PathVariable("userId") UUID userId);
    
    @GetMapping("/api/organizations/{slug}")
    OrganizationDTO getOrganizationBySlug(@PathVariable String slug);
}
```

---

## 📝 Boas Práticas

### 1. **Sempre use DTOs para comunicação externa**
❌ Não exponha entidades JPA diretamente
```java
// ERRADO
@GetMapping("/users/{id}")
public ResponseEntity<User> getUser(...) { ... }
```

✅ Use DTOs
```java
// CORRETO
@GetMapping("/users/{id}")
public ResponseEntity<UserDTO> getUser(...) { ... }
```

### 2. **Use ApiResponse para padronização**
```java
// Todas as respostas têm o mesmo formato
return ResponseEntity.ok(ApiResponse.success(data));
return ResponseEntity.ok(ApiResponse.error("Erro"));
```

### 3. **PageResponse para listagens**
```java
// Sempre retorne metadados de paginação
return ResponseEntity.ok(PageResponse.of(items, total, page, size));
```

### 4. **Validação com Bean Validation**
```java
public class CreatePostRequest {
    @NotBlank(message = "Título é obrigatório")
    @Size(min = 3, max = 255, message = "Título deve ter entre 3 e 255 caracteres")
    private String title;
    
    @NotNull(message = "Conteúdo é obrigatório")
    private String content;
}
```

O `GlobalExceptionHandler` captura erros de validação automaticamente e retorna `ErrorResponse` com `fieldErrors`.

---

## 🧪 Testando Erros

### Erro de validação
```bash
curl -X POST http://localhost:8083/api/social/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "ab"}'  # título muito curto
```

Response:
```json
{
  "timestamp": "2026-02-01T15:40:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Erro de validação nos campos",
  "errorCode": "VALIDATION_ERROR",
  "fieldErrors": {
    "title": ["Título deve ter entre 3 e 255 caracteres"]
  }
}
```

### Erro de autenticação
```bash
curl http://localhost:8083/api/social/profile  # sem token
```

Response:
```json
{
  "timestamp": "2026-02-01T15:40:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Autenticação necessária. Por favor, faça login.",
  "errorCode": "AUTHENTICATION_REQUIRED"
}
```

---

## 🔗 Referências

- [FastAPI Pydantic Models (auth-service)](../../auth-service/src/auth_service/schemas/)
- [Spring Data JPA Pagination](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repositories.query-methods)
- [Bean Validation](https://beanvalidation.org/)
- [Jackson JSON](https://github.com/FasterXML/jackson)
