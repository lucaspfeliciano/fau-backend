# Sprint 10 - Frontend Routes (Roadmap e Views)

## Objetivo

Entregar endpoints para roadmap tabular com filtros/ordenacao e persistencia de views por usuario ou role.

Status backend: concluido.

## Rotas da Sprint

### Bloqueantes

| Metodo | Rota           | Entrega esperada                     |
| ------ | -------------- | ------------------------------------ |
| GET    | /roadmap/items | Roadmap tabular filtravel e paginado |
| GET    | /roadmap/views | Listar views salvas                  |
| POST   | /roadmap/views | Salvar view nova                     |

### Recomendadas

| Metodo | Rota                | Motivo               |
| ------ | ------------------- | -------------------- |
| PATCH  | /roadmap/views/{id} | Atualizar view salva |
| DELETE | /roadmap/views/{id} | Excluir view salva   |

## Contrato minimo (MVP)

### GET /roadmap/items

- query:
  - page, pageSize, search
  - status, ownerId, boardId, category
  - sortBy: score | eta | status
  - sortOrder: asc | desc
  - groupBy opcional
- response:
  - items, total, page, pageSize

### POST /roadmap/views

- body:
  - name: string
  - filters: objeto
  - sort: objeto
  - visibility: private | role | organization
- response:
  - id, name, filters, sort, visibility, createdAt

## Backlog tecnico

1. Criar agregador de roadmap items combinando requests/features/tasks/releases quando necessario.
2. Definir modelo de view com ownerId, roleScope e organizationId.
3. Implementar CRUD de views com RBAC e isolamento por tenant.
4. Garantir paginação consistente para tabela grande.
5. Adicionar exemplos de filtros complexos no Swagger.

## Checklist

- [x] GET /roadmap/items com filtros e ordenacao.
- [x] GET /roadmap/views com escopo de visibilidade.
- [x] POST /roadmap/views com validacao.
- [x] PATCH /roadmap/views/{id} implementado.
- [x] DELETE /roadmap/views/{id} implementado.
- [x] Testes unitarios do servico de roadmap passando.

## Criterios de aceite

- Frontend consegue abrir roadmap paginado sem processamento local pesado.
- Usuario consegue salvar, editar e remover views sem perder contexto.
- Visibilidade de views respeita tenant e role.
