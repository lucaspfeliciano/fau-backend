# Sprint 14 - Frontend Routes (Releases, Analytics e Health)

## Objetivo

Fechar o ciclo de operacao frontend com edicao de releases, metricas de adocao e monitoramento operacional.

## Rotas da Sprint

| Metodo | Rota                | Entrega esperada                                      |
| ------ | ------------------- | ----------------------------------------------------- |
| PATCH  | /releases/{id}      | Editar release/changelog e status                     |
| GET    | /analytics/adoption | Retornar metricas de adocao por periodo/time          |
| GET    | /health/events      | Eventos operacionais para dashboard de confiabilidade |

## Contrato minimo (MVP)

### PATCH /releases/{id}

- body:
  - title opcional
  - notes opcional
  - status: draft | scheduled | published opcional
  - scheduledAt opcional
- response:
  - id, title, notes, status, scheduledAt, updatedAt

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

### GET /health/events

- query:
  - startDate/endDate opcionais
  - severity opcional
  - component opcional
  - page, pageSize
- response:
  - items: [{ id, component, severity, message, metadata, occurredAt }]
  - summary: { total, bySeverity, byComponent }

## Backlog tecnico

1. Evoluir entidade release para suportar edicao de status/publicacao.
2. Criar agregacao de analytics/adoption por janela temporal.
3. Expor eventos operacionais e resumo para dashboard de confiabilidade.
4. Adicionar filtros e paginacao para manter performance.
5. Cobrir testes de regressao para status de release e analytics.

## Checklist

- [ ] PATCH /releases/{id} implementado.
- [ ] GET /analytics/adoption implementado.
- [ ] GET /health/events implementado.
- [ ] Swagger atualizado com exemplos reais.
- [ ] Testes de integracao dos endpoints principais.

## Criterios de aceite

- Frontend consegue editar release sem fluxo manual fora da plataforma.
- Dashboard de adocao apresenta metricas consistentes por periodo.
- Dashboard de confiabilidade consegue consumir eventos operacionais com filtros.
