# Sprint 10 - Event Backbone e Orquestracao

## Objetivo

Evoluir o modelo de eventos para um backbone de orquestracao confiavel, observavel e extensivel.

## Resultado Esperado

No final da sprint, o produto entrega:

- Eventos de dominio versionados e tipados.
- Orquestracao assincrona com retentativa e idempotencia.
- Observabilidade minima do fluxo de eventos.

## Escopo

- Event envelope padrao
- Outbox interno
- Processamento confiavel de eventos

## Backlog Tecnico

1. Contrato de evento

- Definir schema padrao com metadata (eventId, version, actor, tenant, correlationId).
- Catalogar eventos por bounded context.
- Versionar eventos para compatibilidade evolutiva.

2. Confiabilidade

- Implementar outbox local para publicacao confiavel.
- Garantir idempotencia de consumidores.
- Criar politicas de retry e dead-letter basica.

3. Orquestracao de negocio

- Encadear TaskUpdated -> FeatureUpdated -> RequestUpdated -> Notification.
- Reduzir acoplamento entre modulos via subscribers.
- Definir limites claros entre comando e evento.

4. Observabilidade

- Logs estruturados por correlationId.
- Metricas de throughput, erro e latencia de eventos.
- Endpoint interno de health do pipeline de eventos.

## Checklist de Acompanhamento

- [ ] Padronizar envelope de eventos de dominio.
- [ ] Implementar outbox e consumo idempotente.
- [ ] Adicionar retry e dead-letter para falhas transitórias.
- [ ] Validar cadeia de propagacao entre camadas.
- [ ] Implementar metricas e logs de observabilidade.
- [ ] Cobrir cenarios de falha em testes de integracao.

## Critérios de Aceite

- Eventos principais sao processados com rastreabilidade ponta a ponta.
- Falhas transitórias nao causam perda de evento.
- Fluxo automatico entre task, feature, request e notificacao e reproduzivel.

## Fora de Escopo

- Adoção de broker externo (Kafka/Rabbit) em producao.
- Processamento distribuido multi-regiao.
