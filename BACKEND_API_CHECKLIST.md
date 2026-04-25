# ✅ Backend API - Checklist de Validação

Use este checklist para tracking de progresso das correções de API.

---

## 🔴 CRÍTICO - Sprint Atual

### 1. Public Portal Settings - Campos Completos
**Rota:** `GET /api/public/workspaces/:workspaceSlug/settings`  
**Estimativa:** 2-3h

**Implementação:**
- [ ] Adicionar campo `workspaceName`
- [ ] Adicionar campo `logoUrl`
- [ ] Adicionar campo `subtitle`
- [ ] Adicionar campo `publicPortalEnabled`
- [ ] Adicionar campo `publicRoadmapEnabled`
- [ ] Adicionar campo `publicChangelogEnabled`
- [ ] Adicionar campo `widgetEnabled`
- [ ] Adicionar campo `updatedAt`

**Validação:**
```bash
curl http://localhost:3000/api/public/workspaces/lucas-organization/settings | \
  jq 'keys | sort'
```
**Esperado:** Todos os 9 campos presentes

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 2. Similar Requests - Campos Adicionais
**Rota:** `POST /api/public/:workspaceSlug/requests/similar`  
**Estimativa:** 1-2h

**Implementação:**
- [ ] Adicionar campo `id` (alias de `requestId`)
- [ ] Adicionar campo `description`
- [ ] Adicionar campo `commentCount`

**Validação:**
```bash
curl -X POST http://localhost:3000/api/public/lucas-organization/requests/similar \
  -H "Content-Type: application/json" \
  -d '{"title":"Export dashboard"}' | \
  jq '.items[0] | keys | sort'
```
**Esperado:** Campos `id`, `description`, `commentCount` presentes

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 3. Feedbacks - Votes Sempre Presente
**Rota:** `GET /feedbacks`  
**Estimativa:** 1h

**Implementação:**
- [ ] Garantir `votes` sempre presente (default 0)
- [ ] Adicionar campo `voterIds` (array de user IDs)
- [ ] Adicionar campo `commentCount`
- [ ] Adicionar campo `hasUserVoted` (se contexto autenticado)

**Validação:**
```bash
# Teste 1: Nenhum item com votes null
curl http://localhost:3000/feedbacks \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.items[] | select(.votes == null)' | wc -l
# Esperado: 0

# Teste 2: Todos têm voterIds
curl http://localhost:3000/feedbacks \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.items[] | select(.voterIds == null)' | wc -l
# Esperado: 0
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 4. Roadmap Items - Resposta Padronizada
**Rota:** `GET /roadmaps/items`  
**Estimativa:** 1h

**Implementação:**
- [ ] Sempre retornar objeto (nunca array direto)
- [ ] Estrutura: `{ items: [], total: n, page: n, pageSize: n }`
- [ ] Validar query params (page, pageSize)

**Validação:**
```bash
curl http://localhost:3000/roadmaps/items \
  -H "Authorization: Bearer $TOKEN" | \
  jq 'type'
# Esperado: "object" (não "array")

curl http://localhost:3000/roadmaps/items \
  -H "Authorization: Bearer $TOKEN" | \
  jq 'keys | sort'
# Esperado: ["items", "page", "pageSize", "total"]
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 5. Tasks - Assignee Enrichment
**Rota:** `GET /engineering/tasks`  
**Estimativa:** 2h

**Implementação:**
- [ ] Substituir `assigneeId` por objeto `assignee`
- [ ] Incluir `assignee.id`
- [ ] Incluir `assignee.name`
- [ ] Incluir `assignee.email`
- [ ] Incluir `assignee.avatarUrl` (opcional)

**Validação:**
```bash
curl http://localhost:3000/engineering/tasks \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.items[0].assignee | keys | sort'
# Esperado: ["email", "id", "name"] ou ["avatarUrl", "email", "id", "name"]
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

## 🟡 ALTO - Próxima Sprint

### 6. Request Details - Incluir Comentários
**Rota:** `GET /requests/:id`  
**Estimativa:** 2h

**Implementação:**
- [ ] Adicionar array `comments` na resposta
- [ ] Adicionar `meta.commentCount`
- [ ] Suportar query param `includeComments=false` (opt-out)

**Validação:**
```bash
curl http://localhost:3000/requests/req-123 \
  -H "Authorization: Bearer $TOKEN" | \
  jq 'has("comments")'
# Esperado: true
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 7. Sprint Progress - Métricas Detalhadas
**Rota:** `GET /engineering/sprints/:id/progress`  
**Estimativa:** 3h

**Implementação:**
- [ ] Adicionar `summary` (completed, inProgress, todo, total)
- [ ] Adicionar `velocity` (current, average, projected)
- [ ] Adicionar `health` (status, blockers, overdueCount)
- [ ] Adicionar `burndown` (array com histórico diário)

**Validação:**
```bash
curl http://localhost:3000/engineering/sprints/sprint-10/progress \
  -H "Authorization: Bearer $TOKEN" | \
  jq 'keys | sort'
# Esperado: ["burndown", "health", "summary", "velocity"]
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 8. Feature Traceability - Dados Completos
**Rota:** `GET /product/features/:id/traceability`  
**Estimativa:** 3h

**Implementação:**
- [ ] Enriquecer `requests` com customer/company data
- [ ] Enriquecer `tasks` com sprint data
- [ ] Adicionar `releases` array
- [ ] Incluir counts no root level

**Validação:**
```bash
curl http://localhost:3000/product/features/feat-123/traceability \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.requests[0].customers[0] | has("company")'
# Esperado: true
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 9. Public Feedback Details - Nomenclatura Consistente
**Rota:** `GET /api/public/:workspaceSlug/feedbacks/:feedbackId`  
**Estimativa:** 1h

**Implementação:**
- [ ] Renomear campo `request` para `feedback`
- [ ] Adicionar `hasUserVoted`
- [ ] Adicionar `commentCount`
- [ ] Manter backward compatibility (alias `request`)

**Validação:**
```bash
curl http://localhost:3000/api/public/lucas-organization/feedbacks/fb-123 | \
  jq 'has("feedback")'
# Esperado: true
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 10. Integration Status - Dashboard Rico
**Rota:** `GET /integrations/status`  
**Estimativa:** 2h

**Implementação:**
- [ ] Adicionar `health.status` (healthy/warning/error)
- [ ] Adicionar `health.lastError`
- [ ] Adicionar `metrics` (totalSyncs, successRate, avgDuration)
- [ ] Adicionar `overall` summary

**Validação:**
```bash
curl http://localhost:3000/integrations/status \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.integrations[0] | keys | sort'
# Esperado: Incluir "health" e "metrics"
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 11. Request Creation - Similar Incluídos
**Rota:** `POST /requests`  
**Estimativa:** 2h

**Implementação:**
- [ ] Rodar similaridade ao criar request
- [ ] Incluir array `similar` na resposta
- [ ] Limitar a 5 similares mais relevantes

**Validação:**
```bash
curl -X POST http://localhost:3000/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Export by squad", "description":"..."}' | \
  jq 'has("similar")'
# Esperado: true
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 12. Feedbacks Públicos - Votos e IDs
**Rota:** `GET /api/public/:workspaceSlug/feedbacks`  
**Estimativa:** 1h

**Implementação:**
- [ ] Garantir `votes` sempre presente
- [ ] Adicionar `hasUserVoted` (baseado em sessionId)
- [ ] Adicionar `commentCount`

**Validação:**
```bash
curl http://localhost:3000/api/public/lucas-organization/feedbacks | \
  jq '.items[] | {votes, commentCount}' | grep null | wc -l
# Esperado: 0
```

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

## 🟢 MÉDIO - Backlog

### 13. Boards - Contadores de Requests
**Estimativa:** 1h

- [ ] Adicionar `requestCount`
- [ ] Adicionar `openRequestCount`
- [ ] Adicionar `completedCount`

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 14. Customers - Company Inline
**Estimativa:** 2h

- [ ] Adicionar objeto `company` nos items
- [ ] Incluir company.id, name, revenue

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 15. Releases - Features Incluídas
**Estimativa:** 2h

- [ ] Adicionar array `features`
- [ ] Adicionar `featureCount`
- [ ] Incluir status de cada feature

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 16. Notifications - Agrupamento
**Estimativa:** 2h

- [ ] Adicionar `groupKey` para agrupar
- [ ] Adicionar `unreadCount`
- [ ] Adicionar `groupedCount`

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 17. Audit Events - Contexto Enriquecido
**Estimativa:** 2h

- [ ] Adicionar objeto `actor` (id, name, email)
- [ ] Adicionar objeto `target` (id, title)
- [ ] Incluir dados relevantes em metadata

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

### 18. Analytics Adoption - Time Series
**Estimativa:** 3h

- [ ] Adicionar array `timeSeries`
- [ ] Incluir métricas por dia
- [ ] Suportar query params (from, to, granularity)

**Status:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Completo

---

## 📊 Progresso Geral

### Por Prioridade

**🔴 Crítico (5 items):**
- ⬜⬜⬜⬜⬜ 0/5 completos (0%)

**🟡 Alto (7 items):**
- ⬜⬜⬜⬜⬜⬜⬜ 0/7 completos (0%)

**🟢 Médio (6 items):**
- ⬜⬜⬜⬜⬜⬜ 0/6 completos (0%)

**Total:**
- ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0/18 completos (0%)

---

## 🎯 Meta da Sprint Atual

**Completar:** Itens 1-5 (Críticos)  
**Esforço:** 7-9 horas  
**Deadline:** [PREENCHER]

**Progresso:**
```
Sprint Goal: 5 items críticos
[░░░░░░░░░░░░░░░░░░░░] 0/5 (0%)
```

---

## 📝 Registro de Mudanças

### Sprint [NÚMERO] - [DATA]
- [ ] Item completado
- [ ] Item completado
- [ ] ...

---

## 🧪 Testes de Regressão

Após cada implementação, rodar suite completa:

```bash
# Rodar todos os testes de API
npm run test:integration:api

# Ou individual:
npm run test:integration:public-portal
npm run test:integration:requests
npm run test:integration:engineering
```

---

## 📞 Responsáveis

| Área | Responsável | Status |
|------|-------------|--------|
| Public Portal | [NOME] | ⬜ |
| Requests/Feedbacks | [NOME] | ⬜ |
| Engineering (Tasks/Sprints) | [NOME] | ⬜ |
| Product (Features/Initiatives) | [NOME] | ⬜ |
| Integrations | [NOME] | ⬜ |
| Analytics/Audit | [NOME] | ⬜ |

---

**Última atualização:** 17 de Abril, 2026  
**Próxima revisão:** Após cada item completado

---

**Legenda:**
- ⬜ Não iniciado
- 🟡 Em progresso
- ✅ Completo
- ❌ Bloqueado
- ⏸️ Pausado
