# Sprint 13 - Frontend Routes (Users e Audit)

## Objetivo

Destravar telas de administracao de acesso e trilha de auditoria para operacoes sensiveis.

## Rotas da Sprint

| Metodo | Rota             | Entrega esperada                                |
| ------ | ---------------- | ----------------------------------------------- |
| GET    | /users           | Listar usuarios da organizacao                  |
| PATCH  | /users/{id}/role | Alterar papel de acesso (Admin, Editor, Viewer) |
| GET    | /audit/events    | Listar eventos auditaveis                       |

## Contrato minimo (MVP)

### GET /users

- query:
  - page, pageSize
  - search opcional
  - role opcional
- response:
  - items: [{ id, name, email, role, createdAt, lastSeenAt opcional }]
  - total, page, pageSize

### PATCH /users/{id}/role

- body:
  - role: Admin | Editor | Viewer
- response:
  - id, role, updatedAt

### GET /audit/events

- query:
  - actorId opcional
  - action opcional
  - startDate/endDate opcionais
  - page, pageSize
- response:
  - items: [{ id, actorId, action, resourceType, resourceId, payload, occurredAt }]
  - total, page, pageSize

## Backlog tecnico

1. Criar endpoints de users para listagem por tenant com RBAC.
2. Implementar alteracao de role com regras de seguranca (somente admin).
3. Registrar evento de auditoria em toda mudanca de role.
4. Expor consulta de audit/events com filtros e paginacao.
5. Garantir que usuario nao remova ultimo admin sem confirmacao de regra.

## Checklist

- [ ] GET /users implementado.
- [ ] PATCH /users/{id}/role implementado.
- [ ] GET /audit/events implementado.
- [ ] Eventos de role change registrados em auditoria.
- [ ] Testes de autorizacao e seguranca passando.

## Criterios de aceite

- Frontend consegue listar usuarios e editar role sem inconsistencias.
- Alteracoes de role aparecem na trilha de auditoria.
- Regras de seguranca de RBAC impedem mudancas indevidas.
