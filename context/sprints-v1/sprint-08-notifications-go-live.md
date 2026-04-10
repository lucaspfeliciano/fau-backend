# Sprint 08 - Notifications e Go-Live v1

## Objetivo

Fechar o ciclo de comunicação automática entre áreas e garantir critérios técnicos para lançamento da v1.

## Resultado Esperado

No final da sprint, o produto entrega:

- Atualizações automáticas de progresso para stakeholders.
- Estabilidade e documentação suficientes para operação inicial.
- Checklist de lançamento v1 concluído.

## Escopo

- Notificações internas e externas
- Hardening técnico
- Preparação de release

## Backlog Técnico

1. Notificações de negócio

- Disparar eventos quando houver:
  - Mudança de status de request.
  - Mudança de status de feature.
  - Progresso/encerramento de sprint.
  - Release de feature.
- Definir preferências de notificação por organização/time.

2. Visibilidade para CS/Sales

- Endpoint para consulta de roadmap e previsão:
  - `GET /roadmap/overview`
- Endpoint para histórico de atualizações por request:
  - `GET /requests/:id/updates`

3. Hardening

- Revisão de segurança (auth/rbac, validações, exposição de dados).
- Revisão de performance em consultas críticas.
- Padronização final de erros e logs.
- Revisão completa de documentação Swagger.

4. Operação e release

- Definir `.env.example` completo.
- Checklist de deploy e rollback.
- Definir versão inicial de observabilidade (logs e alertas mínimos).

## Ajustes pelos Princípios Core

- Full Traceability:
  - Fechar a cadeia Customer -> Request -> Feature -> Task -> Sprint -> Release com consultas de ponta a ponta.
- Automatic Feedback Loop:
  - Validar propagação automática completa task -> feature -> request -> notificação para CS/Sales.
- Unstructured to Structured Input:
  - Medir qualidade do pipeline de estruturação (taxa de deduplicação, confiança e correção manual).

## Checklist de Acompanhamento

- [ ] Implementar eventos de notificação para mudanças de status e releases.
- [ ] Implementar preferências de notificação por organização/time.
- [ ] Implementar endpoint `GET /roadmap/overview`.
- [ ] Implementar endpoint `GET /requests/:id/updates`.
- [ ] Criar registro de release e vínculo com sprints/features entregues.
- [ ] Implementar consulta de rastreabilidade ponta a ponta para auditoria e suporte.
- [ ] Validar cenários E2E de propagação automática sem sincronização manual.
- [ ] Definir métricas de qualidade da ingestão não estruturada.
- [ ] Executar hardening de segurança, performance, erros e logs.
- [ ] Finalizar documentação Swagger e `.env.example`.
- [ ] Definir e validar checklist de deploy e rollback.
- [ ] Concluir testes unitários de orquestração de notificações.
- [ ] Concluir testes de integração e smoke/E2E do fluxo principal.
- [ ] Validar definição de pronto do v1 em review final.

## Critérios de Aceite

- Stakeholders recebem atualizações automáticas dos eventos principais.
- APIs críticas estão documentadas e com exemplos.
- Sem bloqueadores críticos de segurança/estabilidade para produção inicial.
- Perguntas de rastreabilidade do negócio podem ser respondidas por consulta direta.
- Feedback loop completo validado sem sincronização manual entre times.

## Testes Obrigatórios

- Unitários:
  - Serviço de orquestração de notificações.
- Integração:
  - Eventos de status gerando notificações esperadas.
  - Endpoints de visibilidade retornando histórico consistente.
- Smoke/E2E:
  - Fluxo principal fim-a-fim da plataforma (request -> feature -> task -> sprint -> update).

## Fora de Escopo

- Sistema avançado de templates de mensagens com editor visual.
- SLA de alta disponibilidade enterprise.

## Definição de Pronto do v1

- Todos os critérios de aceite das sprints 01 a 08 concluídos.
- Fluxo principal validado em ambiente de homologação.
- Aprovação conjunta de CS, Product e Engineering no review final.
