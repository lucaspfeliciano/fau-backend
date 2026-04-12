# Plano de Desenvolvimento para Finalizar o Projeto

Data de referencia: 2026-04-12

## Decisao

O plano anterior fazia sentido quando varias rotas ainda estavam faltando.
Depois da analise de codigo, docs e testes, ele ficou defasado.

Plano escolhido:

- Manter a estrutura de fases do plano antigo.
- Remover trabalho ja entregue.
- Focar no delta real para fechar backend e go-live.

## Fontes analisadas

- context/product.md
- context/product-flow.md
- context/backend-rotas-novas-sprints-09-14.md
- context/sprints-v1/README.md
- context/sprints-v1/sprint-01-auth-organizations.md ate sprint-14-frontend-release-analytics-health.md
- context/go-live-v1-checklist.md
- context/integrations.md (arquivo vazio)
- src (controllers, services, eventos, roadmap, analytics, health, audit, integrations)
- test/app.e2e-spec.ts

## Estado atual validado (evidencia objetiva)

### 1. Rotas bloqueantes de frontend (sprints 09 a 14)

As rotas bloqueantes descritas em context/backend-rotas-novas-sprints-09-14.md estao implementadas no codigo dos controllers:

- boards
- requests/similar e comments
- roadmap/items e roadmap/views
- integrations/fireflies/config e import-transcript
- ai/requests/match-similar
- users e users role patch
- audit/events
- releases patch
- analytics/adoption
- health/events
- integrations/linear/status-mapping
- integrations/logs e retry

Conclusao:

- O principal bloqueio nao e mais falta de endpoint.

### 2. Build e testes

- npm run build: OK
- npm run test: 11 suites, 36 testes, tudo verde
- npm run test:e2e: FALHA por ambiente (Mongo indisponivel em localhost:27017)

Conclusao:

- Backend unitariamente estavel.
- Gate de e2e/go-live ainda nao passou por dependencia de ambiente.

### 3. Sprint 10 (event backbone)

Status: parcialmente concluida.

Ja existe:

- envelope de evento com eventId, correlationId e version
- outbox com persistencia, retry e dead-letter
- processador de outbox

Ainda pendente para fechamento robusto:

- catalogo formal de eventos por dominio
- observabilidade operacional do pipeline de eventos
- validacao de idempotencia ponta a ponta em cenarios de falha reais

### 4. Sprint 11 e 12

Status: essencialmente concluidas no backend.

Ja existe:

- modulo de priorizacao com pesos e ranking
- deduplicacao e review queue
- operacao de integracoes (status mapping, logs, retry)

### 5. Sprint 14 (analytics e health)

Status: funcionalidade exposta, maturidade parcial.

Analytics:

- endpoint existe
- hoje usa leituras amplas em memoria e eventos em memoria para usuarios ativos

Health:

- endpoint e repositorio existem
- nao ha produtor consolidado de health events no codigo

Conclusao:

- API existe, mas qualidade operacional dos dados ainda precisa evoluir.

### 6. Contrato OpenAPI

O arquivo openapi.json do repo esta defasado em relacao as rotas atuais.

Conclusao:

- Frontend pode ser bloqueado por contrato/documentacao, mesmo com endpoint implementado.

### 7. Seguranca e operacao

Ponto critico encontrado:

- .env.example contem URI de Mongo com credencial real.

Conclusao:

- Tratar como incidente de seguranca de alta prioridade.

## Delta real para finalizar o projeto

## P0 (bloqueia fechamento)

1. Fechar ambiente de e2e com Mongo confiavel

- Definir estrategia oficial:
  - opcao A: Mongo local via docker-compose para testes
  - opcao B: Mongo em memoria para e2e (ex.: mongodb-memory-server)
- Atualizar setup do test/app.e2e-spec.ts para boot estavel e teardown limpo
- Garantir variaveis de ambiente de teste separadas
- Criterio de aceite: npm run test:e2e verde em maquina limpa

2. Atualizar e automatizar contrato OpenAPI

- Regenerar openapi.json a partir do AppModule atual
- Criar comando dedicado para gerar contrato sem iniciar servidor de forma manual
- Adicionar validacao em CI para detectar drift de contrato
- Criterio de aceite: rotas 09-14 presentes no openapi.json versionado

3. Resolver risco de segredo exposto

- Substituir URI sensivel em .env.example por placeholder
- Rotacionar credenciais eventualmente comprometidas
- Criterio de aceite: nenhum segredo real em arquivos versionados

## P1 (fecha maturidade de backend para go-live)

4. Evoluir observabilidade do backbone de eventos

- Criar catalogo de eventos por bounded context
- Expor metricas de pipeline (pending, completed, dead-letter, retries)
- Gerar health events em falhas criticas (outbox, webhook, sync)
- Criterio de aceite: operacao consegue diagnosticar falha sem debug manual

5. Fortalecer qualidade de analytics/adoption

- Trocar calculo de datas por comparacao de Date consistente
- Reduzir dependencia de eventos apenas em memoria
- Aplicar filtro teamId de forma efetiva
- Adicionar testes de regressao de janela temporal
- Criterio de aceite: metricas repetiveis para mesmo periodo e sem oscilacao por restart

6. Escalabilidade de consultas criticas

- Remover limites fixos 1000/10000 em agregacoes de roadmap/analytics/overview
- Mover filtros/paginacao para camada de repositorio Mongo sempre que possivel
- Revisar e completar indices compostos por organizationId + status/chaves de busca
- Criterio de aceite: consultas principais mantem latencia estavel com volume alto

## P2 (fechamento de produto e operacao)

7. Completar documentacao operacional

- Preencher context/integrations.md (hoje vazio) com:
  - ownership de dados
  - reconciliacao
  - retry/reprocess
  - playbook de incidentes
- Atualizar README com setup real do projeto
- Criterio de aceite: onboarding tecnico sem dependencia de conhecimento tribal

8. Go-live controlado

- Executar checklist de context/go-live-v1-checklist.md
- Rodar smoke test em homologacao com foco em fluxo ponta a ponta:
  customer -> request -> feature -> task -> sprint -> release
- Validar rollback plan
- Criterio de aceite: release candidate aprovado por engenharia + produto + CS

## Sequencia de execucao recomendada

Semana 1

- P0.1 e2e com Mongo confiavel
- P0.2 OpenAPI atualizado e automatizado
- P0.3 segredo removido/rotacionado

Semana 2

- P1.4 observabilidade de eventos
- P1.5 analytics hardening
- P1.6 performance e indices

Semana 3

- P2.7 documentacao operacional
- P2.8 ensaio final de go-live e release

## Cronograma estimado

- P0: 2 a 3 dias
- P1: 4 a 6 dias
- P2: 2 a 3 dias
- Total: 8 a 12 dias uteis

## Riscos principais e mitigacao

1. E2E continuar instavel por dependencia externa

- Mitigacao: padronizar ambiente efemero de teste e teardown agressivo

2. Drift de contrato API reaparecer

- Mitigacao: gate de CI para OpenAPI

3. Eventos sem telemetria suficiente em producao

- Mitigacao: health events + metricas do outbox + dashboard minimo

4. Escala degradar roadmap/analytics

- Mitigacao: paginacao real em repo + indices + limites de query

## Definicao de pronto para encerramento

Backend pode ser considerado finalizado para esta fase quando:

- build e unit tests verdes
- e2e verde em ambiente padrao de desenvolvimento
- rotas 09-14 implementadas e refletidas no openapi versionado
- segredo removido de arquivos de exemplo e credenciais rotacionadas
- metricas de adocao e health com dados confiaveis
- checklist de go-live e rollback executado
