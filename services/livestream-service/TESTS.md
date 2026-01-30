# Testes Unitários - Serviço de Lives

Este documento descreve os testes unitários implementados para o serviço de lives.

## Resumo dos Testes

Total de testes implementados: **80 testes**  
Status: ✅ **Todos os testes passando**

### Estrutura dos Testes

Os testes foram organizados nos seguintes arquivos:

#### 1. **Entity Tests** (25 testes)
- **`live.entity.spec.ts`** - Testa a lógica de domínio da entidade Live
  - Testa criação com status SCHEDULED
  - Testa transição de estado: start(), finish(), cancel()
  - Testa validações de transições inválidas
  - Testa métodos de consulta: isLive(), isScheduled(), hasEnded()
  - Testa fluxos de trabalho completos

#### 2. **Service Tests** (55 testes)

##### CreateLiveService (5 testes)
- `create-livestream.service.spec.ts`
- Cria stream com status SCHEDULED
- Gera stream key aleatório
- Salva metadados de stream key
- Valida parâmetros de entrada

##### GetLiveByIdService (4 testes)
- `get-live-by-id.service.spec.ts`
- Retorna live por ID
- Lança NotFoundException para ID inexistente
- Valida propriedades da entidade retornada

##### FinishLiveService (7 testes)
- `finish-live.service.spec.ts`
- Finaliza stream LIVE
- Muda status para FINISHED
- Emite evento de mudança de status
- Lança NotFoundException para ID inexistente
- Lança InvalidLiveTransitionException para transições inválidas
- Salva alterações no repositório

##### CancelLiveService (7 testes)
- `cancel-live.service.spec.ts`
- Cancela stream SCHEDULED
- Emite evento de cancelamento
- Valida transições de estado
- Lança exceções apropriadas

##### ListLivesService (7 testes)
- `list-lives.service.spec.ts`
- Lista todas as lives sem filtros
- Filtra por status
- Filtra por organizationId
- Filtra por externalMatchId
- Suporta múltiplos filtros simultâneos
- Retorna array vazio quando sem resultados

##### ChatService (8 testes)
- `chat.service.spec.ts`
- Publica mensagens no chat
- Recupera mensagens recentes sem limite
- Recupera mensagens com limite
- Inclui timestamp nas mensagens
- Preserva todas as propriedades

##### PublishMatchEventService (7 testes)
- `publish-match-event.service.spec.ts`
- Publica eventos de partida
- Lança NotFoundException para live inexistente
- Lança BadRequestException para status inválido
- Suporta diferentes tipos de eventos
- Valida transições de estado

##### GetMatchEventsHistoryService (7 testes)
- `get-match-events-history.service.spec.ts`
- Retorna eventos recentes sem limite
- Retorna eventos com limite
- Respeita limite de eventos
- Retorna array vazio quando sem eventos
- Mantém ordem cronológica

## Cenários Cobertos

### Testes de Transição de Estado
- ✅ SCHEDULED → LIVE (via start)
- ✅ LIVE → FINISHED (via finish)
- ✅ SCHEDULED → CANCELLED (via cancel)
- ✅ Validação de transições inválidas
- ✅ Exceções para estados finalizados

### Testes de Erro
- ✅ NotFoundException quando recurso não existe
- ✅ BadRequestException para operações inválidas
- ✅ InvalidLiveTransitionException para transições inválidas
- ✅ LiveAlreadyFinishedException para operações em streams finalizadas

### Testes de Integração com Repositórios
- ✅ Chamadas corretas a repositórios
- ✅ Salvamento de dados
- ✅ Recuperação de dados
- ✅ Filtros e busca

### Testes de Gateway e Eventos
- ✅ Emissão de eventos de mudança de status
- ✅ Emissão de eventos de publicação

### Testes de Validação
- ✅ Geração de stream keys aleatórias
- ✅ Timestamps precisos
- ✅ Preservação de propriedades
- ✅ Metadados corretos

## Cobertura

### Arquivos de Teste
```
src/lives/
├── application/services/
│   ├── cancel-live.service.spec.ts
│   ├── chat.service.spec.ts
│   ├── create-livestream.service.spec.ts
│   ├── finish-live.service.spec.ts
│   ├── get-live-by-id.service.spec.ts
│   ├── get-match-events-history.service.spec.ts
│   ├── list-lives.service.spec.ts
│   └── publish-match-event.service.spec.ts
└── domain/entities/
    └── live.entity.spec.ts
```

## Como Executar os Testes

### Executar todos os testes
```bash
pnpm test
```

### Executar testes em modo watch
```bash
pnpm test:watch
```

### Executar com cobertura
```bash
pnpm test:cov
```

### Executar um arquivo específico
```bash
pnpm test create-livestream.service.spec.ts
```

### Executar em modo debug
```bash
pnpm test:debug
```

## Dependências de Teste

- **Jest**: Framework de teste
- **@nestjs/testing**: Módulo de teste do NestJS
- **ts-jest**: Transformador TypeScript para Jest
- **@types/jest**: Tipagens TypeScript para Jest

## Padrões Utilizados

### Mock de Repositórios
Todos os repositórios são mockados usando jest.fn() para simular comportamentos:

```typescript
const mockLiveRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};
```

### Teste de Exceções
Validação de exceções usando expect().rejects.toThrow():

```typescript
await expect(service.execute(invalidId)).rejects.toThrow(NotFoundException);
```

### Teste de Transições de Estado
Validação completa do fluxo de estados:

```typescript
expect(live.status).toBe(LiveStatus.SCHEDULED);
live.start();
expect(live.status).toBe(LiveStatus.LIVE);
```

## Próximos Passos

Possíveis melhorias para cobertura adicional:

1. Testes de integração com banco de dados
2. Testes E2E para fluxos completos
3. Testes de performance
4. Testes de concorrência
5. Testes de eventos em tempo real (WebSocket/Gateway)

## Comandos Git

Para adicionar estes testes ao repositório:

```bash
git add src/lives/**/*.spec.ts
git add jest.config.ts
git add package.json
git commit -m "test: add comprehensive unit tests for lives service"
git push
```
