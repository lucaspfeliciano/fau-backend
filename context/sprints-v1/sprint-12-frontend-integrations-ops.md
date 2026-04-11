# Sprint 12 - Frontend Routes (Integrations Ops)

## Objetivo

Entregar operacao de integracoes no frontend com configuracao de status mapping, observabilidade de logs e retry manual.

## Rotas da Sprint

| Metodo | Rota                                | Entrega esperada                        |
| ------ | ----------------------------------- | --------------------------------------- |
| GET    | /integrations/linear/status-mapping | Ler mapeamento atual Linear x sistema   |
| PUT    | /integrations/linear/status-mapping | Salvar mapeamento completo              |
| GET    | /integrations/logs                  | Listar logs por provider/status/periodo |
| POST   | /integrations/logs/{logId}/retry    | Reexecutar sync com falha               |

## Contrato minimo (MVP)

### GET /integrations/linear/status-mapping

- response:
  - items: [{ linearStatus, internalStatus, enabled }]
  - updatedAt

### PUT /integrations/linear/status-mapping

- body:
  - items: [{ linearStatus, internalStatus, enabled }]
- response:
  - saved: true
  - updatedAt

### GET /integrations/logs

- query:
  - provider opcional
  - status opcional
  - startDate opcional
  - endDate opcional
  - page, pageSize
- response:
  - items, total, page, pageSize

## Backlog tecnico

1. Persistir status mapping versionado por tenant.
2. Expor leitura e escrita idempotente do mapping.
3. Persistir logs de integracao com correlationId e retryCount.
4. Implementar retry manual com protecao de idempotencia.
5. Incluir filtros de logs para uso operacional no frontend.

## Checklist

- [ ] GET /integrations/linear/status-mapping implementado.
- [ ] PUT /integrations/linear/status-mapping implementado.
- [ ] GET /integrations/logs implementado.
- [ ] POST /integrations/logs/{logId}/retry implementado.
- [ ] Testes de integracao para fluxo de retry.

## Criterios de aceite

- Time de operacao consegue ajustar mapping sem deploy.
- Time consegue investigar falhas por logs filtrados.
- Retry manual funciona com rastreabilidade e sem duplicacao indevida.
