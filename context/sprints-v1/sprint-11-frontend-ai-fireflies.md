# Sprint 11 - Frontend Routes (Fireflies e AI)

## Objetivo

Destravar setup de integracao Fireflies e fluxos de dedupe semantico com revisao humana no frontend.

Status backend: concluido.

## Rotas da Sprint

### Bloqueantes

| Metodo | Rota                                      | Entrega esperada                        |
| ------ | ----------------------------------------- | --------------------------------------- |
| POST   | /integrations/fireflies/config            | Salvar config de integracao             |
| POST   | /integrations/fireflies/import-transcript | Importar transcript para pipeline AI    |
| POST   | /ai/requests/match-similar                | Retornar matches semanticos para dedupe |

### Recomendadas

| Metodo | Rota                                       | Motivo                              |
| ------ | ------------------------------------------ | ----------------------------------- |
| GET    | /integrations/fireflies/config             | Ler config atual para tela de setup |
| GET    | /ai/requests/review-queue                  | Exibir fila de baixa confianca      |
| POST   | /ai/requests/review-queue/{itemId}/approve | Aprovar sugestao                    |
| POST   | /ai/requests/review-queue/{itemId}/reject  | Rejeitar sugestao                   |
| POST   | /ai/requests/review-queue/approve-batch    | Aprovar em lote                     |

## Contrato minimo (MVP)

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
  - organizationId: string opcional (preferivel resolver por token)
- response:
  - matches: [{ requestId, similarityScore, reason }]

## Backlog tecnico

1. Criar provider Fireflies no modulo de integrations com storage seguro de config.
2. Enfileirar importacao de transcript com tracking de importId.
3. Expor endpoint de match semantico com score e justificativa.
4. Criar recurso de review-queue para confianca baixa.
5. Adicionar auditoria para aprovacoes/rejeicoes manuais.

## Checklist

- [x] POST /integrations/fireflies/config implementado.
- [x] GET /integrations/fireflies/config implementado.
- [x] POST /integrations/fireflies/import-transcript implementado.
- [x] POST /ai/requests/match-similar implementado.
- [x] GET /ai/requests/review-queue implementado.
- [x] POST /ai/requests/review-queue/{itemId}/approve implementado.
- [x] POST /ai/requests/review-queue/{itemId}/reject implementado.
- [x] POST /ai/requests/review-queue/approve-batch implementado.

## Criterios de aceite

- Frontend consegue configurar Fireflies e ler status atual sem hacks.
- Frontend consegue importar transcript e mostrar resultado de extração/revisao.
- Fluxo de dedupe semantico fica operacional com aprovacao manual quando necessario.
