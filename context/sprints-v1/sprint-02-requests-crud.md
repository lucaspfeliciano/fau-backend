# Sprint 02 - Requests CRUD

## Objetivo

Entregar o módulo de solicitações com CRUD completo, filtros, paginação e sistema inicial de votos.

## Resultado Esperado

No final da sprint, CS/Sales/Product conseguem:

- Criar, listar, atualizar e arquivar solicitações.
- Filtrar por status/tags.
- Incrementar votos para solicitações existentes.

## Escopo

- `RequestsModule`
- Enums e regras de status (`Backlog`, `Planned`, `In Progress`, `Completed`)

## Backlog Técnico

1. Modelagem

- Criar entidade `Request` com campos base:
  - `title`, `description`, `status`, `votes`, `tags`, `createdBy`, `organizationId`, timestamps.
- Preparar `customerIds[]` e `companyIds[]` como opcionais nesta fase.

2. APIs

- `POST /requests`
- `GET /requests` (paginação + filtros)
- `GET /requests/:id`
- `PATCH /requests/:id`
- `DELETE /requests/:id` (soft delete)
- `POST /requests/:id/vote`

3. Regras de negócio

- `votes` inicia em `1` para novas solicitações.
- Apenas `Admin` e `Editor` podem criar/editar.
- `Viewer` possui acesso somente leitura.

4. Qualidade técnica

- Validação robusta de DTOs.
- Paginação padrão (`page`, `limit`).
- Filtros por `status`, `tag`, `search`.
- Swagger completo com exemplos de filtros.

## Ajustes pelos Princípios Core

- Full Traceability:
  - Toda request deve manter trilha de origem e histórico de mudança de status.
- Automatic Feedback Loop:
  - Emitir eventos de domínio para criação, atualização, votação e mudança de status de request.
- Unstructured to Structured Input:
  - Suportar metadados de origem para requests (`manual`, `meeting-notes`, `sales-conversation`, `slack-message`).

## Checklist de Acompanhamento

- [ ] Modelar entidade `Request` com campos base e soft delete.
- [ ] Implementar endpoints de CRUD e votação.
- [ ] Aplicar paginação e filtros combinados nas listagens.
- [ ] Garantir regras de acesso por papel (`Admin`, `Editor`, `Viewer`).
- [ ] Garantir isolamento por `organizationId` em todas as operações.
- [ ] Persistir metadados de origem da request para entradas estruturadas e não estruturadas.
- [ ] Implementar histórico básico de mudanças de status da request.
- [ ] Emitir eventos de domínio para create/update/status/vote.
- [ ] Documentar endpoints e exemplos no Swagger.
- [ ] Concluir testes unitários de criação/atualização e votação.
- [ ] Concluir testes de integração de CRUD com autenticação e filtros.
- [ ] Validar critérios de aceite em review da sprint.

## Critérios de Aceite

- CRUD funciona para o tenant correto.
- Votação incrementa corretamente sem sobrescrever concorrência simples.
- Listagem suporta paginação e filtros combinados.
- Soft delete não remove documento fisicamente.
- Toda request possui metadados mínimos de origem e auditoria.
- Mudança de status dispara evento de domínio.

## Testes Obrigatórios

- Unitários:
  - Serviço de criação e atualização de request.
  - Serviço de votação.
- Integração:
  - CRUD completo com autenticação.
  - Validação de filtros + paginação.

## Fora de Escopo

- Deduplicação semântica por IA.
- Importação automática de notas de reunião.

## Dependência para Próxima Sprint

Com requests estáveis, a sprint seguinte conecta solicitações a clientes e empresas.
