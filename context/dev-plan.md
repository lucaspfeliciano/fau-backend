# 🎯 Plano de Desenvolvimento — FAU Backend

## Diagnóstico: Estado Atual do Projeto

### ✅ O que já está implementado e funcionando

| Módulo | Status | Persistência | Observações |
|--------|--------|-------------|-------------|
| **Auth** (login, JWT, RBAC) | ✅ Completo | MongoDB | Google OAuth + email/password, guards funcionais |
| **Organizations** | ✅ Completo | MongoDB | Multi-tenant por `organizationId` |
| **Teams** | ✅ Completo | MongoDB | CRUD básico |
| **Users** | ⚠️ Parcial | MongoDB | Service existe, mas **sem controller/rotas expostas** |
| **Requests** | ✅ Completo | MongoDB | CRUD, votos, soft delete, comments, similar, vínculo customer/company |
| **Boards** | ✅ Completo | MongoDB | CRUD com tenant isolation |
| **Companies** | ✅ Completo | MongoDB | CRUD |
| **Customers** | ✅ Completo | MongoDB | CRUD |
| **Product** (Initiatives/Features) | ✅ Completo | MongoDB | CRUD, vínculo request↔feature, traceability |
| **Engineering** (Tasks/Sprints) | ✅ Completo | MongoDB | CRUD, assign sprint, progress, traceability |
| **AI Processing** | ✅ Completo | MongoDB | Import notes, match similar, review queue |
| **Integrations** | ✅ Completo | MongoDB | Slack, HubSpot, Linear, Fireflies |
| **Notifications** | ✅ Completo | MongoDB | Preferences, releases, roadmap overview |
| **Roadmap** | ✅ Completo | MongoDB | Items, views CRUD |

### 🔑 Achado Crítico: Migração MongoDB está essencialmente CONCLUÍDA

A sprint 09 (MongoDB Repository Layer) marcava a migração de in-memory para MongoDB. Analisando o código:

- `DatabaseModule` usa `MongooseModule.forRoot()` ✅
- **Requests**: tem `MongoRequestsRepository` + interface desacoplada ✅
- **Product**: `FeaturesRepository` e `InitiativesRepository` usam Mongoose direto ✅
- **Engineering**: `TasksRepository` e `SprintsRepository` usam Mongoose direto ✅
- Todos os modules registram schemas via `MongooseModule.forFeature()` ✅

> [!IMPORTANT]
> A migração para MongoDB **já aconteceu**, mas com inconsistência arquitetural: `Requests` usa interface + DI, enquanto Product/Engineering usam repositórios concretos diretamente. Isso é um débito, mas não é bloqueante.

---

## 🔴 O que FALTA implementar

Cruzando os checklists das sprints com o OpenAPI spec e o código existente:

### Rotas bloqueantes para o Frontend (que NÃO existem no OpenAPI atual)

| Sprint | Rota | Status |
|--------|------|--------|
| **13** | `GET /users` | ❌ Sem controller |
| **13** | `PATCH /users/{id}/role` | ❌ Sem controller |
| **13** | `GET /audit/events` | ❌ Sem módulo |
| **14** | `PATCH /releases/{id}` | ❌ Não existe |
| **14** | `GET /analytics/adoption` | ❌ Sem módulo |
| **14** | `GET /health/events` | ❌ Sem módulo |
| **12** | `GET /integrations/linear/status-mapping` | ❌ Não existe |
| **12** | `PUT /integrations/linear/status-mapping` | ❌ Não existe |
| **12** | `GET /integrations/logs` | ❌ Não existe |
| **12** | `POST /integrations/logs/{logId}/retry` | ❌ Não existe |

### Módulos/Funcionalidades de Backend que estão pendentes

| Sprint | Funcionalidade | Status |
|--------|---------------|--------|
| **10** | Event Backbone (envelope, outbox, idempotência, dead-letter) | ❌ **Não implementado** |
| **11** | Smart Prioritization Engine (score dinâmico, ranking, explicabilidade) | ❌ **Não implementado** |
| **08** | Hardening de segurança, performance, padronização de erros | ⚠️ **Parcial** |
| **Sprint 01/03** | Padrão de auditoria em entidades base (`createdBy`, `updatedBy`) | ⚠️ **Parcial** |
| **Sprint 03** | Matching por email/domínio para entradas importadas | ❌ **Não implementado** |

---

## 📊 Análise de Débitos Técnicos

### 🟡 Débitos Leves (não bloqueiam, mas devem ser tratados)

1. **Inconsistência no Repository Pattern**: Requests usa interface + DI; Product e Engineering usam repositórios concretos. Padronizar tudo com interface é desejável mas não urgente.

2. **Domain Events Service é in-memory**: O `DomainEventsService` é um array em memória com pub/sub síncrono. Funciona para MVP, mas:
   - Eventos se perdem em restart
   - Sem envelope versionado (eventId, correlationId, version)
   - Sem outbox/retry/dead-letter

3. **Swagger description está desatualizada**: `main.ts` ainda referencia "Sprint 7 foundation".

4. **Repositórios sem paginação real**: Vários repos fazem `find({ organizationId })` sem suporte a skip/limit/filter no nível de query MongoDB.

### 🔴 Débitos Graves (impactam go-live)

1. **Sem módulo de Audit**: Nenhum registro estruturado de ações sensíveis.
2. **Sem Users Controller**: O `UsersModule` existe com service mas sem controller — frontend não pode listar/editar users.
3. **Sem Analytics**: Nenhuma agregação de métricas de adoção.
4. **Releases não editáveis**: Só tem POST e GET, falta PATCH.
5. **Sem observabilidade operacional**: Nenhum endpoint de health events.

---

## 🚀 Plano de Execução — 6 Fases

> [!NOTE]
> As fases são sequenciais com dependências mínimas entre si. Estimativa conservadora de esforço por fase.

---

### Fase 1: Rotas Bloqueantes para Frontend (Sprint 12-13)
**Estimativa: 3-4 dias** | **Prioridade: CRÍTICA** — Frontend está bloqueado

#### 1.1 Users Controller (Sprint 13)
```
Arquivos a criar/modificar:
- src/users/users.controller.ts (NOVO)
- src/users/dto/list-users.dto.ts (NOVO)
- src/users/dto/update-role.dto.ts (NOVO)
- src/users/users.module.ts (adicionar controller)
```

| Rota | Descrição |
|------|-----------|
| `GET /users` | Listar usuários da org com paginação, search e filtro por role |
| `PATCH /users/{id}/role` | Alterar papel (somente Admin) |

**Regras**:
- Somente Admin pode alterar roles
- Não permitir remoção do último Admin
- Emitir evento de auditoria em mudanças

#### 1.2 Audit Module (Sprint 13)
```
Arquivos a criar:
- src/audit/ (novo módulo)
  - audit.module.ts
  - audit.controller.ts
  - audit.service.ts
  - entities/audit-event.entity.ts
  - repositories/audit-event.schema.ts
  - repositories/audit-events.repository.ts
  - dto/list-audit-events.dto.ts
```

| Rota | Descrição |
|------|-----------|
| `GET /audit/events` | Listar eventos com filtros (actorId, action, dateRange, resourceType) |

**Design**: Registrar automaticamente via subscriber no DomainEventsService para ações sensíveis (role change, delete, config change).

#### 1.3 Integrations Ops (Sprint 12)
```
Arquivos a modificar:
- src/integrations/integrations.controller.ts
- src/integrations/integrations.service.ts
- src/integrations/entities/ (novos schemas)
- src/integrations/repositories/ (novos repos)
```

| Rota | Descrição |
|------|-----------|
| `GET /integrations/linear/status-mapping` | Ler mapeamento Linear ↔ sistema |
| `PUT /integrations/linear/status-mapping` | Salvar mapeamento |
| `GET /integrations/logs` | Logs de sync com filtros |
| `POST /integrations/logs/{logId}/retry` | Retry manual idempotente |

#### 1.4 Releases Edit + Analytics + Health (Sprint 14)
```
Arquivos a criar/modificar:
- src/notifications/notifications.controller.ts (adicionar PATCH /releases)
- src/notifications/notifications.service.ts (lógica de edição)
- src/analytics/ (novo módulo)
  - analytics.module.ts
  - analytics.controller.ts
  - analytics.service.ts
- src/health/ (novo módulo ou expandir app)
  - health.controller.ts
  - health.service.ts
```

| Rota | Descrição |
|------|-----------|
| `PATCH /releases/{id}` | Editar release (draft → scheduled → published) |
| `GET /analytics/adoption` | Métricas de adoção por período/time |
| `GET /health/events` | Eventos operacionais com severity |

---

### Fase 2: Event Backbone (Sprint 10)
**Estimativa: 3-5 dias** | **Prioridade: ALTA** — Sustenta feedback loop automático

```
Arquivos a criar/modificar:
- src/common/events/domain-event.interface.ts (evoluir)
- src/common/events/domain-events.service.ts (refatorar)
- src/common/events/event-envelope.ts (NOVO)
- src/common/events/event-catalog.ts (NOVO)
- src/common/events/outbox/ (NOVO)
  - outbox.schema.ts
  - outbox.repository.ts
  - outbox-processor.service.ts
- src/common/events/subscribers/ (NOVO)
  - feature-status-propagator.subscriber.ts
  - request-status-propagator.subscriber.ts
  - notification-trigger.subscriber.ts
```

**Objetivos**:
1. **Envelope padronizado**: `{ eventId, type, version, actor, tenant, correlationId, payload, occurredAt }`
2. **Outbox local**: Persistir eventos no Mongo antes de processar (garante durabilidade)
3. **Processamento idempotente**: Consumer registra eventId processado para evitar duplicação
4. **Retry com backoff**: Política de 3 tentativas com exponential backoff
5. **Dead-letter**: Eventos que falharam ficam marcados para investigação
6. **Cadeia de propagação**: `TaskUpdated → FeatureUpdated → RequestUpdated → Notification`

> [!WARNING]
> O DomainEventsService atual é in-memory e síncrono. A refatoração deve ser **retrocompatível** — os módulos que já emitem eventos devem continuar funcionando sem mudanças nos services.

---

### Fase 3: Smart Prioritization Engine (Sprint 11)
**Estimativa: 3-4 dias** | **Prioridade: MÉDIA-ALTA** — Core do valor de produto

```
Arquivos a criar:
- src/prioritization/ (novo módulo)
  - prioritization.module.ts
  - prioritization.service.ts
  - prioritization.controller.ts
  - entities/priority-score.entity.ts
  - repositories/priority-score.schema.ts
  - repositories/priority-scores.repository.ts
  - dto/score-explanation.dto.ts
```

**Modelo de Score**:
```
score = (w1 × votes_normalized) 
      + (w2 × revenue_impact_normalized)
      + (w3 × customer_tier_weight)
      + (w4 × churn_risk_weight)
      + (w5 × strategic_tag_bonus)
```

| Rota | Descrição |
|------|-----------|
| `GET /prioritization/ranking/requests` | Ranking de requests por score |
| `GET /prioritization/ranking/features` | Ranking de features por score |
| `GET /prioritization/score/{entityType}/{id}` | Score detalhado com explicação |
| `PUT /prioritization/weights` | Pesos configuráveis por org (Admin) |

**Integração com Eventos**: Recalcular score automaticamente em:
- `RequestVoted`, `RequestCustomerLinked`
- `FeatureRequestLinked`, `FeatureStatusChanged`
- `CompanyUpdated` (mudança de revenue/tier)

---

### Fase 4: Padronização e Qualidade Arquitetural
**Estimativa: 2-3 dias** | **Prioridade: MÉDIA**

#### 4.1 Padronizar Repository Pattern
- Extrair interfaces para Product e Engineering repositories (como já feito em Requests)
- Garantir DI por token em todos os módulos

#### 4.2 Paginação real nos Repositories
- Adicionar `skip`, `limit`, `sort`, `filter` no nível MongoDB em todos os repos
- Hoje vários controllers fazem paginação in-memory sobre `listByOrganization()`

#### 4.3 Auditoria base em entidades
- Garantir `createdBy`, `updatedBy` em todas as entidades que ainda não têm
- Registrar changes de status no histórico (para requests isso já existe)

#### 4.4 Matching por email/domínio
- Implementar lógica no `CustomersService` para associar automaticamente customers a companies pelo domínio do email
- Usado no pipeline de AI e importação HubSpot

---

### Fase 5: Hardening e Preparação de Go-Live (Sprint 08 pendências)
**Estimativa: 2-3 dias** | **Prioridade: ALTA para produção**

#### 5.1 Segurança
- [ ] Revisar todos os endpoints sem `@UseGuards(JwtAuthGuard)` 
- [ ] Validar que todos os controllers aplicam RBAC correto
- [ ] Sanitizar inputs em DTOs (class-validator/class-transformer)
- [ ] Validar que webhooks externos (Linear, Slack) têm assinatura/verificação
- [ ] Rate limiting básico nos endpoints públicos

#### 5.2 Performance
- [ ] Adicionar índices compostos no MongoDB para queries frequentes:
  - `{ organizationId, status }` em requests, features, tasks
  - `{ organizationId, deletedAt }` em requests
  - `{ organizationId, boardId }` em requests
- [ ] Revisar queries N+1 no roadmap aggregation e traceability

#### 5.3 Observabilidade
- [ ] Logs estruturados com correlationId
- [ ] Error tracking padronizado (expandir `GlobalExceptionFilter`)
- [ ] Health check endpoint (`GET /health`)

#### 5.4 Documentação
- [ ] Atualizar descrição do Swagger para refletir estado final
- [ ] Garantir response schemas em todos os endpoints (hoje o OpenAPI tem responses sem schema)
- [ ] Revisar `.env.example` com todas as variáveis necessárias

---

### Fase 6: Validação E2E e Go-Live
**Estimativa: 2-3 dias** | **Prioridade: BLOQUEANTE para produção**

#### 6.1 Testes E2E
- [ ] Fluxo completo: Register → Create Request → Link Customer → Create Feature → Create Task → Assign Sprint → Update Status → Verify Propagation
- [ ] Validar feedback loop automático task → feature → request → notification
- [ ] Validar isolamento multi-tenant
- [ ] Validar RBAC em todos os cenários

#### 6.2 Checklist de Deploy (do `go-live-v1-checklist.md`)
- [ ] Build limpo em CI
- [ ] Suite e2e passando
- [ ] `.env` completo com segredos rotacionados
- [ ] Smoke test em homologação
- [ ] Release notes publicadas
- [ ] Monitoramento básico habilitado

#### 6.3 Rollback Plan
- [ ] Definir versão anterior safe
- [ ] Snapshot de configuração
- [ ] Endpoints críticos para validação pós-deploy

---

## 📅 Cronograma Resumido

| Fase | O que | Estimativa | Bloqueia |
|------|-------|-----------|----------|
| **1** | Rotas bloqueantes frontend (12-14) | 3-4 dias | Frontend |
| **2** | Event Backbone | 3-5 dias | Feedback loop confiável |
| **3** | Smart Prioritization | 3-4 dias | Priorização by-score |
| **4** | Padronização arquitetural | 2-3 dias | Qualidade de código |
| **5** | Hardening + go-live prep | 2-3 dias | Produção |
| **6** | Validação E2E + deploy | 2-3 dias | Go-live |
| | **Total estimado** | **15-22 dias** | |

---

## ⚠️ Riscos e Decisões Pendentes

### Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Event Backbone refactor quebra módulos existentes | Alto | Manter API retrocompatível no DomainEventsService |
| Smart Prioritization sem dados reais para validar | Médio | Usar dataset sintético + pesos default conservadores |
| Analytics aggregation lenta com volume alto | Médio | Usar aggregation pipeline do MongoDB com índices adequados |
| Sem CI/CD configurado | Alto | Priorizar setup mínimo antes de Fase 6 |

### Decisões que precisam ser tomadas

1. **Event Backbone**: Usar NestJS EventEmitter2 ou manter implementação custom?
   - **Recomendação**: Manter custom com outbox MongoDB para garantir durabilidade sem adicionar dependência de broker externo na v1.

2. **Analytics**: Agregação em tempo real via MongoDB aggregation ou snapshot periódico?
   - **Recomendação**: MongoDB aggregation por agora; escala para v1 é baixa.

3. **Releases Module**: Mover releases para um módulo próprio ou manter no NotificationsModule?
   - **Recomendação**: Continuar no Notifications por agora (já está lá), extrair depois se crescer.

4. **Testes**: Investir em suite e2e robusta ou focar em integração por módulo?
   - **Recomendação**: Testes de integração por módulo + 1 teste e2e do fluxo principal. Mais ROI no prazo disponível.

---

## 🏁 Definição de Pronto

O backend está pronto para v1 quando:

- [ ] Todas as 10 rotas bloqueantes do frontend estão implementadas e documentadas
- [ ] Feedback loop automático `Task → Feature → Request → Notification` funciona end-to-end
- [ ] Score de priorização dinâmico está operacional
- [ ] Trilha de auditoria registra ações sensíveis
- [ ] Isolamento multi-tenant validado
- [ ] Hardening de segurança concluído
- [ ] Testes E2E do fluxo principal passando
- [ ] Swagger completo com schemas de response
- [ ] Checklist de deploy/rollback validado
