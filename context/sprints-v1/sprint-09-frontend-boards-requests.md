# Sprint 09 - Frontend Routes (Boards e Requests)

## Objetivo

Destravar o frontend de feedback workspace com boards e suporte a comentarios/similaridade de requests no momento da criacao.

Status backend: concluido.

## Rotas da Sprint

### Bloqueantes

| Metodo | Rota                    | Entrega esperada                 |
| ------ | ----------------------- | -------------------------------- |
| GET    | /boards                 | Listar boards do tenant          |
| POST   | /boards                 | Criar board no workspace         |
| POST   | /requests/similar       | Retornar similares em tempo real |
| POST   | /requests/{id}/comments | Inserir comentario na request    |

### Recomendadas

| Metodo | Rota                    | Motivo                           |
| ------ | ----------------------- | -------------------------------- |
| GET    | /requests/{id}/comments | Leitura dedicada de comentarios  |
| PATCH  | /boards/{id}            | Editar board sem migracao futura |

## Contrato minimo (MVP)

### POST /requests/similar

- body:
  - title: string
  - details: string
  - boardId: string opcional
  - customerId: string opcional
- response:
  - items: [{ requestId, title, similarityScore, actionSuggested }]

### POST /requests/{id}/comments

- body:
  - comment: string
- response:
  - id, requestId, comment, createdBy, createdAt

## Backlog tecnico

1. Criar modulo de boards com persistencia por organizationId.
2. Adicionar endpoint de similaridade reaproveitando motor atual de texto/similarity.
3. Modelar comentarios vinculados a request com trilha de autor/data.
4. Publicar Swagger com exemplos reais de payload.
5. Cobrir testes de integracao para fluxo completo frontend.

## Checklist

- [x] GET /boards implementado com paginacao minima.
- [x] POST /boards implementado com validacao de nome.
- [x] PATCH /boards/{id} implementado.
- [x] POST /requests/similar implementado com score ordenado.
- [x] POST /requests/{id}/comments implementado.
- [x] GET /requests/{id}/comments implementado.
- [x] Testes unitarios dos fluxos bloqueantes passando.

## Criterios de aceite

- Frontend consegue criar request com sugestao de similares antes de salvar.
- Frontend consegue criar e listar comentarios da request sem depender de events gerais.
- Boards ficam isolados por tenant e respeitam autenticacao/RBAC.
