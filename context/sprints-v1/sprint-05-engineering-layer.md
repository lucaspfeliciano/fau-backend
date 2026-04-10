# Sprint 05 - Engineering Layer (Tasks/Sprints)

## Objetivo

Permitir que engenharia execute o roadmap de produto transformando features em tarefas e sprints rastreáveis.

## Resultado Esperado

No final da sprint, Engineering consegue:

- Criar tarefas a partir de features.
- Organizar tarefas em sprints.
- Acompanhar status, estimativas e datas de entrega.

## Escopo

- `EngineeringModule`
- Entidades `Task` e `Sprint`
- Relação com `ProductModule` (features)

## Backlog Técnico

1. Modelagem

- Criar `Task`:
  - `title`, `description`, `featureId`, `sprintId?`, `status`, `estimate`, `organizationId`.
- Criar `Sprint`:
  - `name`, `startDate`, `endDate`, `status`, `organizationId`.

2. APIs de sprint

- `POST /engineering/sprints`
- `GET /engineering/sprints`
- `PATCH /engineering/sprints/:id`

3. APIs de task

- `POST /engineering/tasks`
- `GET /engineering/tasks`
- `PATCH /engineering/tasks/:id`
- `POST /engineering/tasks/:id/assign-sprint/:sprintId`

4. Regras de negócio

- Task obrigatoriamente vinculada a uma feature.
- Status mínimo de task: `Todo`, `In Progress`, `Done`, `Blocked`.
- Sprint não pode ser encerrada com tasks abertas sem justificativa.

5. Qualidade técnica

- Filtros por `status`, `sprintId`, `featureId`.
- Swagger com exemplos de fluxo feature -> tasks -> sprint.

## Ajustes pelos Princípios Core

- Full Traceability:
  - Garantir cadeia navegável task -> feature -> request -> customer/company.
- Automatic Feedback Loop:
  - Mudança de status de task deve atualizar progresso da feature automaticamente.
- Unstructured to Structured Input:
  - Manter referência de origem das requests nas tasks para preservar contexto de entrada.

## Checklist de Acompanhamento

- [ ] Modelar entidades `Task` e `Sprint`.
- [ ] Implementar APIs de sprint (create/read/update).
- [ ] Implementar APIs de task e associação com sprint.
- [ ] Garantir regra de task obrigatoriamente vinculada a feature.
- [ ] Implementar consulta task -> feature -> request -> customer/company.
- [ ] Implementar atualização automática de progresso da feature por status de tasks.
- [ ] Preservar referência de origem da request no contexto de execução da task.
- [ ] Garantir validação de fechamento de sprint com tasks pendentes.
- [ ] Documentar fluxo feature -> task -> sprint no Swagger.
- [ ] Concluir testes unitários de tasks e fechamento de sprint.
- [ ] Concluir testes de integração do fluxo completo de execução.
- [ ] Validar critérios de aceite em review da sprint.

## Critérios de Aceite

- Feature pode gerar múltiplas tasks.
- Tasks podem ser agrupadas em sprint com datas válidas.
- Progresso de sprint pode ser consultado por API.
- Mudança de status de task atualiza a feature correspondente sem sincronização manual.

## Testes Obrigatórios

- Unitários:
  - Serviço de criação de tasks e validação de feature.
  - Serviço de fechamento de sprint.
- Integração:
  - Fluxo completo feature -> task -> sprint -> update de status.

## Fora de Escopo

- Gestão avançada de capacidade por pessoa.
- Dependências complexas entre tasks (grafo).

## Dependência para Próxima Sprint

Com camada de execução pronta, IA pode acelerar entrada de solicitações e classificação automática.
