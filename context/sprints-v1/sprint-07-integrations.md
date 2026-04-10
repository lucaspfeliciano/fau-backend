# Sprint 07 - Integrations (Slack, HubSpot, Linear)

## Objetivo

Conectar a plataforma aos sistemas externos prioritários para reduzir trabalho manual e ampliar visibilidade.

## Resultado Esperado

No final da sprint, o produto consegue:

- Enviar notificações básicas para Slack.
- Sincronizar dados essenciais com HubSpot.
- Sincronizar execução com Linear (nível inicial).

## Escopo

- `IntegrationsModule`
- Conectores para Slack, HubSpot e Linear

## Backlog Técnico

1. Arquitetura de integração

- Criar camada de conectores independentes por provedor.
- Configurar credenciais por organização (quando aplicável).
- Criar serviço de retry simples para falhas transitórias.

2. Slack

- Evento inicial: mudança de status de request/feature/sprint.
- Endpoint de configuração do webhook por organização.

3. HubSpot

- Sincronização básica de `Company` e `Customer`.
- Estratégia inicial unidirecional (HubSpot -> plataforma) ou manual por endpoint.

4. Linear

- Criar/atualizar issue no Linear a partir de `Task`.
- Persistir `externalId` para reconciliação.

5. APIs e operações

- `POST /integrations/slack/config`
- `POST /integrations/hubspot/sync`
- `POST /integrations/linear/sync`
- `GET /integrations/status`

6. Qualidade técnica

- Logs de integração com correlation id.
- Métricas básicas de sucesso/falha por integração.
- Swagger com requisitos de autenticação por provedor.

## Ajustes pelos Princípios Core

- Full Traceability:
  - Persistir mapeamento entre IDs internos e externos (`request`, `feature`, `task`) para auditoria de sincronização.
- Automatic Feedback Loop:
  - Consumir eventos/webhooks externos relevantes e refletir status internamente.
- Unstructured to Structured Input:
  - Preparar ingestão de mensagens de Slack como entrada para pipeline de estruturação.

## Checklist de Acompanhamento

- [ ] Implementar arquitetura de conectores separados por provedor.
- [ ] Implementar configuração e envio de eventos para Slack.
- [ ] Implementar sincronização básica de `Company` e `Customer` com HubSpot.
- [ ] Implementar criação/atualização de issue no Linear com `externalId`.
- [ ] Implementar endpoints operacionais de integrações.
- [ ] Persistir mapeamento de IDs internos x externos para rastreabilidade.
- [ ] Implementar consumo de webhooks/eventos externos para atualização automática de status.
- [ ] Preparar endpoint/fluxo de ingestão de mensagens Slack para AI processing.
- [ ] Implementar retry básico e logs com correlation id.
- [ ] Documentar autenticação e payloads no Swagger.
- [ ] Concluir testes unitários de adaptadores e mapeamentos.
- [ ] Concluir testes de integração de sync e cenários de erro/retry.
- [ ] Validar critérios de aceite em review da sprint.

## Critérios de Aceite

- Slack recebe eventos de mudança de status.
- HubSpot sincroniza pelo menos campos essenciais de cliente/empresa.
- Linear cria ou atualiza issues de tasks sem duplicação indevida.
- Atualizações externas relevantes refletem status internos automaticamente.

## Testes Obrigatórios

- Unitários:
  - Adaptadores de cada integração.
  - Mapeamento de payload interno -> externo.
- Integração:
  - Cenário feliz de sync para cada provedor (mockado quando necessário).
  - Cenário de erro e retry.

## Fora de Escopo

- Sincronização bidirecional completa para todos os provedores.
- Marketplace de integrações com UI avançada.

## Dependência para Próxima Sprint

Com integrações prontas, a sprint final fecha o ciclo de notificações automáticas e preparação de go-live da v1.
