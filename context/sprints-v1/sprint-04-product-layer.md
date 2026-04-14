# Sprint 04 - Product Layer (Initiatives/Features)

## Objetivo

Criar a camada de produto para transformar requests em iniciativas e features priorizadas.

## Resultado Esperado

No final da sprint, Product consegue:

- Converter solicitações em iniciativas/features.
- Definir prioridade e status de execução.
- Manter rastreabilidade entre requests e roadmap.

## Escopo

- `ProductModule`
- Entidades `Initiative` e `Feature`
- Relação com `RequestsModule`

## Backlog Técnico

1. Modelagem

- Criar `Initiative`:
  - `title`, `description`, `status`, `priority`, `organizationId`.
- Criar `Feature`:
  - `title`, `description`, `status`, `priority`, `relatedRequests[]`, `initiativeId?`, `organizationId`.

2. APIs

- `POST /product/initiatives`
- `GET /product/initiatives`
- `PATCH /product/initiatives/:id`
- `POST /product/features`
- `GET /product/features`
- `PATCH /product/features/:id`
- `POST /product/features/:id/requests/:requestId`

3. Regras de negócio

- Feature pode existir sem initiative no início (flexível).
- Prioridade inicial baseada em:
  - `votes`
  - impacto por cliente/empresa
  - tags estratégicas.
- Histórico básico de mudança de status (mínimo: data + usuário).

4. Qualidade técnica

- Consultas com paginação e filtros por `status`/`priority`.
- Swagger com exemplos de conversão request -> feature.

## Ajustes pelos Princípios Core

- Full Traceability:
  - Garantir visão de rastreabilidade de feature para requests e clientes impactados.
- Automatic Feedback Loop:
  - Definir regra inicial de propagação de status de feature para requests relacionadas.
- Unstructured to Structured Input:
  - Preservar trilha de origem das requests associadas a cada feature.

## Checklist de Acompanhamento

- [x] Modelar entidades `Initiative` e `Feature`.
- [x] Implementar APIs de iniciativas e features.
- [x] Implementar vínculo entre feature e requests.
- [x] Implementar regra de priorização inicial.
- [x] Implementar consulta de rastreabilidade feature -> requests -> customers.
- [x] Implementar propagação inicial de status feature -> requests.
- [x] Preservar trilha de origem das requests relacionadas na feature.
- [x] Implementar histórico básico de mudança de status.
- [x] Documentar fluxo request -> feature no Swagger.
- [x] Concluir testes unitários de priorização e vínculo.
- [x] Concluir testes de integração request -> feature -> initiative.
- [x] Validar critérios de aceite em review da sprint.

## Critérios de Aceite

- Requests podem ser relacionadas a uma ou mais features.
- Product consegue listar backlog por prioridade.
- Status de iniciativa/feature segue fluxo definido e validado.
- Mudança de status de feature atualiza requests relacionadas automaticamente.
- É possível identificar clientes impactados a partir de uma feature.

## Testes Obrigatórios

- Unitários:
  - Regra de priorização inicial.
  - Serviço de vínculo entre request e feature.
- Integração:
  - Fluxo request -> feature -> initiative.

## Fora de Escopo

- Algoritmo avançado de priorização com machine learning.
- Roadmap visual completo (timeline UI).

## Dependência para Próxima Sprint

Com camada de produto pronta, engenharia pode quebrar features em tarefas e sprints de execução.
