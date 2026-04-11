# Plano de Sprints - Produto v1

Este plano transforma o documento de produto em uma execução incremental, com foco em entregar valor de negócio rápido e manter baixa complexidade técnica.

## Premissas Gerais

- Duração sugerida por sprint: 2 semanas.
- Cadência: planejamento no início da sprint, review/demo no final.
- Stack: NestJS + TypeScript + MongoDB (Mongoose).
- Arquitetura: módulos independentes, camadas Controller/Service/Repository, DTOs com validação.
- Qualidade mínima por sprint:
  - Swagger atualizado com exemplos de request/response.
  - Testes unitários nos serviços críticos da sprint.
  - Testes de integração dos endpoints principais da sprint.
  - Tratamento global de erros e logs básicos.

## Princípios Core Transversais

Os princípios abaixo são obrigatórios em todas as sprints:

- Full Traceability:
  - Toda entidade deve manter vínculos e metadados suficientes para navegar na cadeia Customer -> Request -> Feature -> Task -> Sprint -> Release.
  - Decisões e mudanças de status devem ser auditáveis (quem, quando, origem).
- Automatic Feedback Loop:
  - Mudanças de status devem propagar automaticamente entre camadas via eventos de domínio.
  - Evitar sincronização manual entre times/sistemas.
- Unstructured to Structured Input:
  - Entradas não estruturadas (meeting notes, sales conversations, Slack messages) devem virar dados estruturados.
  - Sempre que possível, com deduplicação e vínculo a clientes/requests existentes.
- Event-Driven System:
  - Toda ação relevante deve gerar evento de domínio versionado e auditável.
  - Eventos devem propagar atualizações entre camadas sem acoplamento direto entre módulos.
- Smart Prioritization:
  - Priorização deve combinar votos, receita, tier de cliente, risco de churn e contexto estratégico.
  - Requests e features devem expor score dinâmico com explicabilidade mínima.
- Intelligent Deduplication:
  - Duplicidades devem considerar similaridade semântica e não apenas texto exato.
  - Duplicações de alta confiança devem sugerir merge, consolidar votos e preservar evidências.
- External Tools as Extensions:
  - Sistema interno é a fonte de verdade; ferramentas externas são extensões de operação.
  - Integrações não podem quebrar rastreabilidade nem regras de negócio centrais.

## Sequência de Implementação (v1)

1. [Sprint 01 - Auth e Organizations](./sprint-01-auth-organizations.md)
2. [Sprint 02 - Requests CRUD](./sprint-02-requests-crud.md)
3. [Sprint 03 - Customers e Companies](./sprint-03-customers-companies.md)
4. [Sprint 04 - Product Layer (Initiatives/Features)](./sprint-04-product-layer.md)
5. [Sprint 05 - Engineering Layer (Tasks/Sprints)](./sprint-05-engineering-layer.md)
6. [Sprint 06 - AI Processing (v0)](./sprint-06-ai-processing-v0.md)
7. [Sprint 07 - Integrations (Slack, HubSpot, Linear)](./sprint-07-integrations.md)
8. [Sprint 08 - Notifications e Go-Live v1](./sprint-08-notifications-go-live.md)

## Sequência de Evolução (v1.1)

9. [Sprint 09 - MongoDB e Repository Layer](./sprint-09-mongodb-repository-layer.md)
10. [Sprint 10 - Event Backbone e Orquestração](./sprint-10-event-backbone-orchestration.md)
11. [Sprint 11 - Smart Prioritization Engine](./sprint-11-smart-prioritization-engine.md)
12. [Sprint 12 - Intelligent Deduplication v1](./sprint-12-intelligent-deduplication-v1.md)
13. [Sprint 13 - Source of Truth e Integrações v2](./sprint-13-source-of-truth-integrations-v2.md)

## Sequência de Entrega de Rotas para Frontend (09-14)

9. [Sprint 09 - Frontend Routes (Boards e Requests)](./sprint-09-frontend-boards-requests.md)
10. [Sprint 10 - Frontend Routes (Roadmap e Views)](./sprint-10-frontend-roadmap-views.md)
11. [Sprint 11 - Frontend Routes (Fireflies e AI)](./sprint-11-frontend-ai-fireflies.md)
12. [Sprint 12 - Frontend Routes (Integrations Ops)](./sprint-12-frontend-integrations-ops.md)
13. [Sprint 13 - Frontend Routes (Users e Audit)](./sprint-13-frontend-users-audit.md)
14. [Sprint 14 - Frontend Routes (Releases, Analytics e Health)](./sprint-14-frontend-release-analytics-health.md)

## Critérios de Conclusão do v1

O produto pode ser considerado pronto para v1 quando todos os itens abaixo forem atendidos:

- Login com Google OAuth, JWT e RBAC ativo por organização.
- Fluxo principal fim-a-fim funcionando:
  - Solicitação criada/importada.
  - Solicitação relacionada a cliente/empresa.
  - Solicitação convertida em feature/iniciativa.
  - Feature gerando tarefas e alocação em sprint de engenharia.
  - Atualizações de status retornando para áreas de CS/Sales.
- Multi-tenant funcional (organizations + teams + users com papéis).
- Integrações prioritárias da v1 operacionais (ao menos com sincronização básica).
- Processamento de notas por IA disponível em versão inicial.
- Rastreabilidade ponta a ponta disponível:
  - Customer -> Request -> Feature -> Task -> Sprint -> Release.
  - Consultas que respondem quem pediu, o que está em execução, status atual e previsão de entrega.
- Feedback loop automático validado:
  - Task atualiza feature.
  - Feature atualiza request.
  - Request atualiza comunicação com CS/Sales.
- Ingestão não estruturada contemplando, no mínimo:
  - Meeting notes.
  - Sales conversations.
  - Slack messages.
- Observabilidade mínima e estabilidade:
  - Logs úteis para debug.
  - Erros padronizados.
  - Documentação de API completa.

## Riscos Gerais e Mitigações

- Risco: escopo crescer cedo demais.
  - Mitigação: manter critérios de "fora de escopo" por sprint e evitar overengineering.
- Risco: integração externa atrasar roadmap.
  - Mitigação: começar com conectores simples e sincronização unidirecional na v1.
- Risco: IA gerar ruído e duplicações.
  - Mitigação: manter revisão humana e regras de deduplicação simples no início.

## Regra de Operação

Cada sprint deve ser executada em ordem. Mudanças de escopo devem ser registradas antes de entrar na sprint seguinte.
