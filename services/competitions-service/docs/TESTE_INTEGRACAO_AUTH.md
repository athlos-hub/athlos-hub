# Payloads para Teste de Integração Auth-Service ↔ Competitions-Service

## Dados do Usuário Válido
- **User ID**: `8703a83f-3f1a-452b-9564-833e0b68ec60`
- **Email**: `hian.silva@escolar.ifrn.edu.br`
- **Username**: `hian.silva`

## Dados da Organização
- **Organization ID**: `1bc7664d-e646-412e-8fd7-81ac3d040b24`
- **Slug**: `teste`
- **Owner ID**: `8703a83f-3f1a-452b-9564-833e0b68ec60` (mesmo usuário)

---

## 1. Criar Competição de Liga (1 membro por time)

**POST** `/api/v1/competitions/teste`

> **NOTA**: O sistema `LEAGUE` não existe. Use `points` para pontos corridos (liga).
> Valores aceitos: `points`, `elimination`, `mixed`

```json
{
  "name": "Liga Teste Integração",
  "modality_id": 1,
  "start_date": "2026-02-10T10:00:00",
  "end_date": "2026-03-10T18:00:00",
  "system": "points",
  "min_members_per_team": 1,
  "max_members_per_team": 5,
  "ruleset": {
    "name": "Regra Liga Teste",
    "segment_type": "TIME",
    "segments_regular_number": 2,
    "overtime_segments": 0,
    "penalty_segments": 0,
    "has_break_segments": true
  }
}
```

---

## 2. Criar Time 1 (com usuário válido)

**POST** `/api/v1/teams/`

```json
{
  "organization_slug": "teste",
  "competition_id": 1,
  "name": "Time Alpha",
  "abbreviation": "ALP",
  "captain_user_id": "8703a83f-3f1a-452b-9564-833e0b68ec60",
  "players": [
    {
      "user_id": "8703a83f-3f1a-452b-9564-833e0b68ec60"
    }
  ]
}
```

---

## 3. Criar Time 2 (com usuário INVÁLIDO - para testar erro)

**POST** `/api/v1/teams/`

```json
{
  "organization_slug": "teste",
  "competition_id": 1,
  "name": "Time Beta",
  "abbreviation": "BET",
  "captain_user_id": "00000000-0000-0000-0000-000000000001",
  "players": [
    {
      "user_id": "00000000-0000-0000-0000-000000000001"
    }
  ]
}
```

**Resposta esperada**: Erro 400 - Usuário não é membro válido da organização

---

## 4. Criar Time com Organização INVÁLIDA (para testar erro)

**POST** `/api/v1/teams/`

```json
{
  "organization_slug": "organizacao-inexistente",
  "competition_id": 1,
  "name": "Time Gamma",
  "abbreviation": "GAM",
  "captain_user_id": "8703a83f-3f1a-452b-9564-833e0b68ec60",
  "players": [
    {
      "user_id": "8703a83f-3f1a-452b-9564-833e0b68ec60"
    }
  ]
}
```

**Resposta esperada**: Erro 404 - Organização não encontrada

---

## Comandos cURL para Testes

### Criar Competição
```bash
curl -X POST "http://localhost:8001/api/v1/competitions/teste" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Liga Teste Integração",
    "modality_id": 1,
    "start_date": "2026-02-10T10:00:00",
    "end_date": "2026-03-10T18:00:00",
    "system": "points",
    "min_members_per_team": 1,
    "max_members_per_team": 5,
    "ruleset": {
      "name": "Regra Liga Teste",
      "segment_type": "TIME",
      "segments_regular_number": 2,
      "overtime_segments": 0,
      "penalty_segments": 0,
      "has_break_segments": true
    }
  }'
```

### Criar Time Válido
```bash
curl -X POST "http://localhost:8001/api/v1/teams/" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_slug": "teste",
    "competition_id": 1,
    "name": "Time Alpha",
    "abbreviation": "ALP",
    "captain_user_id": "8703a83f-3f1a-452b-9564-833e0b68ec60",
    "players": [
      {"user_id": "8703a83f-3f1a-452b-9564-833e0b68ec60"}
    ]
  }'
```

### Criar Time com Usuário Inválido (deve falhar)
```bash
curl -X POST "http://localhost:8001/api/v1/teams/" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_slug": "teste",
    "competition_id": 1,
    "name": "Time Beta",
    "abbreviation": "BET",
    "captain_user_id": "00000000-0000-0000-0000-000000000001",
    "players": [
      {"user_id": "00000000-0000-0000-0000-000000000001"}
    ]
  }'
```
