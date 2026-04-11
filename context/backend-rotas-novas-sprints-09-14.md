# Backend - Rotas novas para Sprints 09 a 14

## Objetivo

Listar as rotas novas que o backend precisa expor para destravar o desenvolvimento do frontend nas sprints 09 a 14.

## Premissas

- Baseado nos arquivos de sprint 09 a 14.
- Considerando o OpenAPI atual do projeto.
- Rotas abaixo sao as que nao aparecem hoje no contrato atual ou precisam ser adicionadas para cobrir checklist funcional.

## Rotas novas bloqueantes (frontend depende direto)

| Sprint | Metodo | Rota                                      | Para que serve                                              |
| ------ | ------ | ----------------------------------------- | ----------------------------------------------------------- |
| 09     | GET    | /boards                                   | Listar boards para filtros e criacao de request             |
| 09     | POST   | /boards                                   | Criar board novo no workspace de feedback                   |
| 09     | POST   | /requests/similar                         | Buscar requests similares em tempo real durante criacao     |
| 09     | POST   | /requests/{id}/comments                   | Adicionar comentario na timeline da request                 |
| 10     | GET    | /roadmap/items                            | Retornar roadmap tabular com filtros, ordenacao e paginacao |
| 10     | GET    | /roadmap/views                            | Listar views salvas por usuario/role                        |
| 10     | POST   | /roadmap/views                            | Salvar nova view de roadmap                                 |
| 11     | POST   | /integrations/fireflies/config            | Configurar credenciais e parametros da integracao Fireflies |
| 11     | POST   | /integrations/fireflies/import-transcript | Importar transcript do Fireflies para pipeline de AI        |
| 11     | POST   | /ai/requests/match-similar                | Match semantico para dedupe e sugestao de merge/+1          |
| 13     | GET    | /users                                    | Listar usuarios da organizacao para gestao de acesso        |
| 13     | PATCH  | /users/{id}/role                          | Alterar role de usuario (Admin, Editor, Viewer)             |
| 13     | GET    | /audit/events                             | Listar trilha de auditoria para acoes sensiveis             |
| 14     | PATCH  | /releases/{id}                            | Editar release/changelog (draft, scheduled, published)      |
| 14     | GET    | /analytics/adoption                       | Metricas de adocao por area/time                            |
| 14     | GET    | /health/events                            | Eventos operacionais para dashboard de confiabilidade       |

## Rotas novas recomendadas (evitam retrabalho nas mesmas sprints)

| Sprint | Metodo | Rota                                       | Motivo                                                 |
| ------ | ------ | ------------------------------------------ | ------------------------------------------------------ |
| 09     | GET    | /requests/{id}/comments                    | Ler comentarios separados de updates quando necessario |
| 09     | PATCH  | /boards/{id}                               | Editar nome/config de board sem migracao futura        |
| 10     | PATCH  | /roadmap/views/{id}                        | Atualizar view salva                                   |
| 10     | DELETE | /roadmap/views/{id}                        | Excluir view salva                                     |
| 11     | GET    | /integrations/fireflies/config             | Ler config atual para tela de setup                    |
| 11     | GET    | /ai/requests/review-queue                  | Fila de baixa confianca para human in the loop         |
| 11     | POST   | /ai/requests/review-queue/{itemId}/approve | Aprovar item da fila                                   |
| 11     | POST   | /ai/requests/review-queue/{itemId}/reject  | Rejeitar item da fila                                  |
| 11     | POST   | /ai/requests/review-queue/approve-batch    | Aprovacao em lote                                      |
| 12     | GET    | /integrations/linear/status-mapping        | Ler mapeamento de status Linear x sistema              |
| 12     | PUT    | /integrations/linear/status-mapping        | Salvar mapeamento de status                            |
| 12     | GET    | /integrations/logs                         | Listar logs de sync por provider/periodo/status        |
| 12     | POST   | /integrations/logs/{logId}/retry           | Disparar retry manual para falha de sync               |

## Payload minimo sugerido (MVP)

### POST /requests/similar

- body:
  - title: string
  - details: string
  - boardId: string opcional
  - customerId: string opcional
- response:
  - items: lista com requestId, title, similarityScore, actionSuggested

### GET /roadmap/items

- query:
  - page, pageSize, search
  - status, ownerId, boardId, category
  - sortBy (score, eta, status), sortOrder
  - groupBy opcional
- response:
  - items, total, page, pageSize

### POST /integrations/fireflies/import-transcript

- body:
  - externalTranscriptId: string
  - title: string
  - transcriptText: string
  - happenedAt: ISO date opcional
  - participants: lista opcional
- response:
  - importId
  - extractedItemsCount
  - queuedForReviewCount

### POST /ai/requests/match-similar

- body:
  - text: string
  - organizationId: string (ou resolvido pelo token)
- response:
  - matches: lista com requestId, similarityScore, reason

### GET /analytics/adoption

- query:
  - startDate, endDate
  - teamId opcional
- response:
  - requestsCreated
  - votesCount
  - avgResponseTime
  - completedCycles
  - activeUsersByRole

## Ordem sugerida para backend comecar agora

1. Sprint 09 bloqueantes: boards, requests/similar, comments.
2. Sprint 10 bloqueantes: roadmap/items e roadmap/views.
3. Sprint 11 bloqueantes: fireflies config/import e match-similar.
4. Sprint 13 bloqueantes: users, role patch, audit/events.
5. Sprint 14 bloqueantes: releases patch, analytics/adoption, health/events.
6. Em paralelo: rotas recomendadas de Sprint 12 para operacao de integracoes (logs, retry, status mapping).
