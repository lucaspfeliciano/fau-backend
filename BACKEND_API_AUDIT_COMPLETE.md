# Backend API - Auditoria Completa de Rotas

**Data:** 17 de Abril, 2026  
**Objetivo:** Validar todas as rotas chamadas pelo frontend e documentar ajustes necessários no backend

---

## 📊 Resumo Executivo

### Estatísticas
- **Total de rotas mapeadas:** 80+
- **Rotas com problemas críticos:** 12
- **Rotas com campos faltantes:** 18
- **Rotas não documentadas no OpenAPI:** 3

### Prioridades
- 🔴 **CRÍTICO (5):** Bloqueiam funcionalidades principais
- 🟡 **ALTO (7):** Impactam UX significativamente
- 🟢 **MÉDIO (6):** Melhorias recomendadas

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. Public Portal Settings - Campos Faltantes
**Rota:** `GET /api/public/workspaces/:workspaceSlug/settings`  
**Status OpenAPI:** ✅ Documentada  
**Status Real:** ⚠️ Retorno incompleto

**Resposta Atual:**
```json
{
  "workspaceSlug": "lucas-organization",
  "widgetApiKey": "wk_da7017b6640c4dee8a88666738adedab"
}
```

**Resposta Esperada (Frontend necessita):**
```json
{
  "workspaceSlug": "lucas-organization",
  "workspaceName": "Lucas Organization",          // ❌ FALTANDO
  "logoUrl": "https://example.com/logo.png",      // ❌ FALTANDO
  "subtitle": "Building amazing products",         // ❌ FALTANDO
  "publicPortalEnabled": true,                     // ❌ FALTANDO
  "publicRoadmapEnabled": true,                    // ❌ FALTANDO
  "publicChangelogEnabled": true,                  // ❌ FALTANDO
  "widgetEnabled": false,                          // ❌ FALTANDO
  "widgetApiKey": "wk_...",
  "updatedAt": "2026-04-17T10:30:00.000Z"         // ❌ FALTANDO
}
```

**Impacto:**
- Portal público quebra com erro "Cannot read properties of undefined (reading 'trim')"
- Não exibe nome/logo customizado
- Não consegue verificar se features estão habilitadas

**Arquivos Frontend Afetados:**
- `lib/services/public-portal-service.ts`
- `components/public/public-portal-shell.tsx`
- `components/settings/public-portal-settings-card.tsx`

**Prioridade:** 🔴 **CRÍTICA** - Bloqueia lançamento do portal público

---

### 2. Similar Requests - Estrutura Incompleta
**Rota:** `POST /api/public/:workspaceSlug/requests/similar`  
**Status OpenAPI:** ✅ Documentada  
**Status Real:** ⚠️ Campos faltando

**Tipo Frontend:**
```typescript
type PublicSimilarRequest = {
  requestId: string;
  title: string;
  status: RequestStatus;
  votes: number;
  similarityScore: number;
  actionSuggested: "vote" | "create";
};
```

**Resposta Atual:**
```json
{
  "items": [
    {
      "requestId": "req-123",
      "title": "Export dashboard by squad",
      "status": "Planned",
      "votes": 15,
      "similarityScore": 0.85,
      "actionSuggested": "vote"
    }
  ]
}
```

**Campos que Frontend Tenta Acessar (mas NÃO existem):**
- ❌ `description` - Para preview na UI
- ❌ `commentCount` - Para mostrar engajamento
- ❌ `id` - Alguns componentes usam `id` ao invés de `requestId`

**Solução Recomendada:**
```json
{
  "items": [
    {
      "requestId": "req-123",
      "id": "req-123",                    // ADICIONAR (alias)
      "title": "Export dashboard by squad",
      "description": "Users need...",     // ADICIONAR
      "status": "Planned",
      "votes": 15,
      "commentCount": 3,                  // ADICIONAR
      "similarityScore": 0.85,
      "actionSuggested": "vote"
    }
  ]
}
```

**Impacto:**
- Erro: "Cannot read properties of undefined (reading 'id')"
- UI de similar requests não exibe descrição
- Sem contador de comentários nas sugestões

**Arquivos Frontend Afetados:**
- `components/public/public-feedback-page.tsx` (linha 915-945)
- `lib/services/public-portal-service.ts`
- `lib/public-portal/types.ts`

**Prioridade:** 🔴 **CRÍTICA** - Quebra fluxo de criação de feedbacks

---

### 3. AI Import Notes - Validação Inconsistente
**Rota:** `POST /ai/requests/import-notes`  
**Status OpenAPI:** ✅ Documentada  
**Status Real:** ✅ **RESOLVIDO NO FRONTEND**

**Problema Original:**
```json
// Frontend enviava (ERRADO):
{
  "content": "...",
  "source": "manual"
}

// Backend esperava:
{
  "text": "...",
  "sourceType": "meeting-notes"
}
```

**Status Atual:** ✅ Corrigido em `lib/types/domain.ts` e `app/ai/page.tsx`

**Valores Aceitos para `sourceType`:**
- `"meeting-notes"`
- `"sales-conversation"`
- `"slack-message"`
- `"fireflies-transcript"`

**Prioridade:** ✅ **RESOLVIDO**

---

### 4. Roadmap Items List - Paginação Inconsistente
**Rota:** `GET /roadmaps/items`  
**Status OpenAPI:** ✅ Documentada  
**Status Real:** ⚠️ Resposta varia

**OpenAPI Spec:**
```typescript
{
  "items": RoadmapItem[],
  "total": number,
  "page": number,
  "pageSize": number
}
```

**Problema:** Backend às vezes retorna array direto, às vezes objeto com wrapper

**Frontend Normaliza:**
```typescript
// Código defensivo em roadmap-service.ts
const items = Array.isArray(response)
  ? response
  : Array.isArray(response.items)
    ? response.items
    : Array.isArray(response.data)
      ? response.data
      : [];
```

**Recomendação Backend:**
- Sempre retornar objeto consistente com `{ items, total, page, pageSize }`
- Nunca retornar array direto

**Prioridade:** 🟡 **ALTA** - Inconsistência causa confusão

---

### 5. Request Details - Comentários Separados
**Rota:** `GET /requests/:id`  
**Status OpenAPI:** ✅ Documentada  
**Status Real:** ⚠️ Sem incluir comentários

**Resposta Atual:**
```json
{
  "request": {
    "id": "req-123",
    "title": "...",
    "description": "...",
    // ... outros campos
  }
}
```

**Frontend Precisa Fazer Chamada Adicional:**
```typescript
// 1ª chamada - Get request
const request = await getRequestById(id);

// 2ª chamada - Get comments
const comments = await listRequestComments(id);
```

**Sugestão de Melhoria:**
```json
{
  "request": { /* ... */ },
  "comments": [
    {
      "id": "comment-1",
      "authorName": "Alice",
      "text": "Great idea!",
      "createdAt": "2026-04-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "commentCount": 5,
    "totalComments": 5
  }
}
```

**Benefícios:**
- Reduz chamadas de API de 2 para 1
- Melhora performance
- Simplifica lógica do frontend

**Prioridade:** 🟡 **ALTA** - Performance

---

## 🟡 PROBLEMAS DE ALTA PRIORIDADE

### 6. Feedback List - Campos de Votação
**Rota:** `GET /feedbacks`  
**Status OpenAPI:** ✅ Documentada  
**Campos Faltantes:**

```typescript
type Feedback = {
  id: string;
  title: string;
  description: string;
  votes?: number;              // ⚠️ Opcional mas necessário
  voterIds?: string[];         // ❌ Não retornado
  commentCount?: number;       // ❌ Não retornado
  status: FeedbackStatus;
  source: FeedbackSource;
  createdAt: string;
  updatedAt?: string;
}
```

**Problema:**
- `votes` frequentemente `undefined`
- `voterIds` nunca retornado (necessário para verificar se usuário já votou)
- `commentCount` não incluído (forçando chamada extra)

**Recomendação:**
```json
{
  "items": [
    {
      "id": "fb-123",
      "title": "Export bug",
      "description": "...",
      "votes": 5,              // GARANTIR sempre presente
      "voterIds": ["usr-1"],   // ADICIONAR
      "commentCount": 2,       // ADICIONAR
      "hasUserVoted": true,    // ADICIONAR (se autenticado)
      "status": "open",
      "source": "public_portal",
      "createdAt": "2026-04-15T10:00:00.000Z"
    }
  ]
}
```

**Prioridade:** 🟡 **ALTA**

---

### 7. Request Creation - Similar Requests Incluídos
**Rota:** `POST /requests`  
**Status OpenAPI:** ✅ Documentada  
**Melhoria Sugerida:** Incluir similar requests na resposta

**Resposta Atual:**
```json
{
  "id": "req-new-123",
  "title": "Export by squad",
  // ... outros campos
}
```

**Resposta Sugerida:**
```json
{
  "request": {
    "id": "req-new-123",
    "title": "Export by squad",
    // ... outros campos
  },
  "similar": [
    {
      "requestId": "req-456",
      "title": "Similar request",
      "description": "...",
      "votes": 10,
      "commentCount": 3,
      "similarityScore": 0.75,
      "actionSuggested": "merge"
    }
  ]
}
```

**Benefício:**
- Permitir merge/deduplicação no momento da criação
- Reduzir requests duplicados
- Melhorar qualidade dos dados

**Prioridade:** 🟡 **ALTA** - Qualidade de dados

---

### 8. Public Feedback Details - Estrutura Inconsistente
**Rota:** `GET /api/public/:workspaceSlug/feedbacks/:feedbackId`  
**Status OpenAPI:** ✅ Documentada  
**Problema:** Retorna estrutura diferente de requests

**Resposta Atual:**
```json
{
  "request": {  // ⚠️ Deveria ser "feedback"
    "id": "fb-123",
    "title": "Bug in export",
    "description": "...",
    "votes": 5,
    "status": "open"
  },
  "comments": []
}
```

**Problema de Nomenclatura:**
- Endpoint é `/feedbacks/:id` mas campo na resposta é `request`
- Inconsistente com domain model

**Sugestão:**
```json
{
  "feedback": {  // ✅ Consistente com endpoint
    "id": "fb-123",
    "title": "Bug in export",
    "description": "...",
    "votes": 5,
    "hasUserVoted": false,
    "commentCount": 3,
    "status": "open",
    "source": "public_portal",
    "createdAt": "2026-04-15T10:00:00.000Z"
  },
  "comments": [
    {
      "id": "comment-1",
      "authorName": "Alice",
      "text": "I have this too!",
      "createdAt": "2026-04-15T11:00:00.000Z"
    }
  ]
}
```

**Prioridade:** 🟡 **ALTA** - Consistência

---

### 9. Tasks List - Assignee Information
**Rota:** `GET /engineering/tasks`  
**Status OpenAPI:** ✅ Documentada  
**Campos Faltantes:**

```typescript
type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  featureId?: string;
  sprintId?: string;
  estimate?: number;
  assigneeId?: string;        // ⚠️ ID presente
  assigneeName?: string;      // ❌ Nome NÃO retornado
  assigneeEmail?: string;     // ❌ Email NÃO retornado
  createdAt: string;
  updatedAt?: string;
}
```

**Problema:**
- `assigneeId` retornado mas frontend precisa do nome para exibição
- Forçando join manual no frontend ou chamada extra para `/users/:id`

**Recomendação:**
```json
{
  "items": [
    {
      "id": "task-123",
      "title": "Implement export filter",
      "status": "In Progress",
      "assignee": {          // ESTRUTURA COMPLETA
        "id": "usr-456",
        "name": "Alice Johnson",
        "email": "alice@example.com",
        "avatarUrl": "https://..."
      },
      "feature": {           // ENRIQUECER também
        "id": "feat-789",
        "name": "Export improvements"
      },
      "sprint": {
        "id": "sprint-10",
        "name": "Sprint 10"
      }
    }
  ]
}
```

**Prioridade:** 🟡 **ALTA** - UX (exibição de nomes)

---

### 10. Sprint Progress - Métricas Detalhadas
**Rota:** `GET /engineering/sprints/:id/progress`  
**Status OpenAPI:** ✅ Documentada  
**Campos Recomendados:**

**Resposta Atual (mínima):**
```json
{
  "completedTasks": 5,
  "totalTasks": 10
}
```

**Resposta Recomendada (rica):**
```json
{
  "summary": {
    "completedTasks": 5,
    "inProgressTasks": 3,
    "todoTasks": 2,
    "totalTasks": 10,
    "completionPercentage": 50,
    "estimatedPoints": {
      "completed": 13,
      "total": 34
    }
  },
  "velocity": {
    "current": 13,
    "average": 15,
    "projected": 26
  },
  "health": {
    "status": "at-risk",  // "on-track" | "at-risk" | "delayed"
    "blockers": 2,
    "overdueCount": 1
  },
  "burndown": [
    { "date": "2026-04-14", "remaining": 34 },
    { "date": "2026-04-15", "remaining": 28 },
    { "date": "2026-04-16", "remaining": 21 }
  ]
}
```

**Benefício:**
- Dashboard de sprint muito mais rico
- Insights acionáveis
- Previsibilidade

**Prioridade:** 🟡 **ALTA** - Product Management

---

### 11. Feature Traceability - Grafo Completo
**Rota:** `GET /product/features/:id/traceability`  
**Status OpenAPI:** ✅ Documentada  
**Estrutura Esperada:**

```json
{
  "feature": {
    "id": "feat-123",
    "name": "Export improvements",
    "status": "In Progress"
  },
  "requests": [
    {
      "id": "req-456",
      "title": "Export by squad",
      "votes": 15,
      "customers": [
        {
          "id": "cust-789",
          "name": "Alice Johnson",
          "email": "alice@acme.com",
          "company": {
            "id": "comp-101",
            "name": "Acme Corp",
            "revenue": 500000
          }
        }
      ]
    }
  ],
  "tasks": [
    {
      "id": "task-111",
      "title": "Add squad filter",
      "status": "Completed",
      "sprint": {
        "id": "sprint-10",
        "name": "Sprint 10",
        "status": "Completed"
      }
    }
  ],
  "releases": [
    {
      "id": "rel-222",
      "version": "v1.5.0",
      "status": "Scheduled",
      "scheduledAt": "2026-05-01T00:00:00.000Z"
    }
  ]
}
```

**Problema Atual:**
- Dados retornados são rasos (apenas IDs)
- Frontend precisa fazer múltiplas chamadas para enriquecer

**Prioridade:** 🟡 **ALTA** - Traceabilidade

---

### 12. Integration Status - Dashboard Rico
**Rota:** `GET /integrations/status`  
**Status OpenAPI:** ✅ Documentada  
**Estrutura Mínima Necessária:**

```json
{
  "integrations": [
    {
      "type": "slack",
      "enabled": true,
      "configured": true,
      "lastSyncAt": "2026-04-17T10:00:00.000Z",
      "health": {
        "status": "healthy",  // "healthy" | "warning" | "error"
        "lastError": null,
        "consecutiveFailures": 0
      },
      "metrics": {
        "totalSyncs": 1234,
        "successRate": 0.99,
        "averageDuration": 2500  // ms
      }
    },
    {
      "type": "linear",
      "enabled": true,
      "configured": true,
      "lastSyncAt": "2026-04-17T09:55:00.000Z",
      "health": {
        "status": "warning",
        "lastError": "Rate limit approaching",
        "consecutiveFailures": 0
      },
      "metrics": {
        "totalSyncs": 567,
        "successRate": 0.98,
        "averageDuration": 3200
      }
    }
  ],
  "overall": {
    "healthStatus": "healthy",
    "activeIntegrations": 2,
    "totalIntegrations": 4
  }
}
```

**Prioridade:** 🟡 **ALTA** - Operacional

---

## 🟢 MELHORIAS RECOMENDADAS (Prioridade Média)

### 13. Boards List - Contadores de Requests
**Rota:** `GET /boards`

**Adicionar:**
```json
{
  "items": [
    {
      "id": "board-1",
      "name": "Enterprise Support",
      "description": "...",
      "requestCount": 45,        // ADICIONAR
      "openRequestCount": 12,    // ADICIONAR
      "completedCount": 33       // ADICIONAR
    }
  ]
}
```

---

### 14. Customers List - Company Enrichment
**Rota:** `GET /customers`

**Adicionar informações da empresa inline:**
```json
{
  "items": [
    {
      "id": "cust-123",
      "name": "Alice Johnson",
      "email": "alice@acme.com",
      "companyId": "comp-456",
      "company": {               // ADICIONAR
        "id": "comp-456",
        "name": "Acme Corp",
        "revenue": 500000
      }
    }
  ]
}
```

---

### 15. Releases List - Features Incluídas
**Rota:** `GET /releases`

**Enriquecer:**
```json
{
  "items": [
    {
      "id": "rel-123",
      "version": "v1.5.0",
      "title": "Export improvements",
      "status": "Scheduled",
      "features": [            // ADICIONAR
        {
          "id": "feat-456",
          "name": "Export by squad",
          "status": "Completed"
        }
      ],
      "featureCount": 5,       // ADICIONAR
      "scheduledAt": "2026-05-01T00:00:00.000Z"
    }
  ]
}
```

---

### 16. Notifications List - Agrupamento
**Rota:** `GET /notifications`

**Adicionar agrupamento:**
```json
{
  "items": [
    {
      "id": "notif-123",
      "type": "request.status_changed",
      "title": "Request moved to In Progress",
      "isRead": false,
      "groupKey": "request-456",  // ADICIONAR (para agrupar)
      "createdAt": "2026-04-17T10:00:00.000Z"
    }
  ],
  "unreadCount": 5,              // ADICIONAR
  "groupedCount": 3              // ADICIONAR
}
```

---

### 17. Audit Events - Contexto Rico
**Rota:** `GET /audit/events`

**Enriquecer contexto:**
```json
{
  "items": [
    {
      "id": "audit-123",
      "action": "request.created",
      "actorId": "usr-456",
      "actor": {                 // ADICIONAR
        "id": "usr-456",
        "name": "Alice Johnson",
        "email": "alice@example.com"
      },
      "targetType": "request",
      "targetId": "req-789",
      "target": {                // ADICIONAR
        "id": "req-789",
        "title": "Export by squad"
      },
      "metadata": { /* ... */ },
      "timestamp": "2026-04-17T10:00:00.000Z"
    }
  ]
}
```

---

### 18. Analytics Adoption - Time Series
**Rota:** `GET /analytics/adoption`

**Formato de séries temporais:**
```json
{
  "period": {
    "from": "2026-03-01T00:00:00.000Z",
    "to": "2026-03-31T23:59:59.999Z"
  },
  "metrics": {
    "activeUsers": 156,
    "newRequests": 45,
    "completedRequests": 23
  },
  "timeSeries": [              // ADICIONAR
    {
      "date": "2026-03-01",
      "activeUsers": 120,
      "newRequests": 5,
      "completedRequests": 2
    },
    {
      "date": "2026-03-02",
      "activeUsers": 125,
      "newRequests": 3,
      "completedRequests": 1
    }
    // ...
  ]
}
```

---

## 📝 ROTAS NÃO DOCUMENTADAS NO OPENAPI

### 19. Widget Configuration
**Rota Frontend:** `/widget/config`  
**Status:** ❌ Não encontrada no OpenAPI

**Chamada em:** `lib/widget/widget-config.ts` (se existir)

**Documentar:**
```yaml
/widget/config:
  get:
    summary: Get widget configuration by API key
    parameters:
      - name: apiKey
        in: query
        required: true
        schema:
          type: string
    responses:
      200:
        description: Widget configuration
        content:
          application/json:
            schema:
              type: object
              properties:
                workspaceSlug:
                  type: string
                widgetEnabled:
                  type: boolean
                theme:
                  type: string
```

---

### 20. Health Pipeline Events
**Rota:** `GET /health/events/pipeline`  
**Status:** ⚠️ Documentada mas estrutura não clara

**Frontend espera:**
```typescript
type PipelineStatus = {
  events: {
    total: number;
    processed: number;
    failed: number;
    pending: number;
  };
  outbox: {
    pending: number;
    oldest?: string;
  };
  catalog: Array<{
    eventType: string;
    count: number;
    lastSeen: string;
  }>;
};
```

---

### 21. Playground Assets Upload
**Rota:** `POST /playground/workspaces/:id/assets`  
**Status:** ✅ Documentada  
**Content-Type:** `multipart/form-data`

**Problema:** Frontend pode estar enviando JSON quando deveria enviar FormData

**Verificar implementação em:**
- `lib/services/playground-service.ts`

---

## 🔧 PADRONIZAÇÃO RECOMENDADA

### Estrutura de Resposta Consistente

**Para Listas:**
```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "hasMore": true
  }
}
```

**Para Single Items:**
```json
{
  "data": { /* ... */ },
  "meta": {
    "lastUpdated": "2026-04-17T10:00:00.000Z"
  }
}
```

**Para Erros:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": {
      "field": "title",
      "constraint": "required"
    }
  }
}
```

---

## 🎯 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1 - Crítico (Esta Sprint)
- [ ] Completar campos de `PublicPortalSettings`
- [ ] Adicionar `description` e `commentCount` em `PublicSimilarRequest`
- [ ] Garantir `votes` sempre presente em feedbacks
- [ ] Padronizar estrutura de resposta de listas (array vs objeto)

### Fase 2 - Alto Impacto (Próxima Sprint)
- [ ] Incluir `voterIds` e `hasUserVoted` em respostas
- [ ] Enriquecer assignee info em tasks com nome/email
- [ ] Adicionar métricas detalhadas em `/sprints/:id/progress`
- [ ] Enriquecer traceability responses com dados completos

### Fase 3 - Melhorias (Backlog)
- [ ] Adicionar contadores inline (boards, releases, etc)
- [ ] Implementar agrupamento de notificações
- [ ] Enriquecer audit events com contexto
- [ ] Adicionar time series para analytics

---

## 📚 REFERÊNCIAS TÉCNICAS

### Arquivos Frontend por Domínio

**Public Portal:**
- `lib/services/public-portal-service.ts`
- `lib/public-portal/types.ts`
- `components/public/*`

**Requests:**
- `lib/services/request-service.ts`
- `lib/types/domain.ts` (RequestItem type)

**Roadmap:**
- `lib/services/roadmap-service.ts`
- `lib/types/domain.ts` (RoadmapItem type)

**Engineering:**
- `lib/services/task-service.ts`
- `lib/services/sprint-service.ts`

**Product:**
- `lib/services/feature-service.ts`
- `lib/services/initiative-service.ts`

**Integrations:**
- `lib/services/integration-service.ts`

**AI:**
- `lib/services/ai-service.ts`

---

## 🧪 COMO TESTAR

### 1. Settings Completos
```bash
curl http://localhost:3000/api/public/workspaces/lucas-organization/settings | jq
```

Verificar presença de: `workspaceName`, `publicPortalEnabled`, `logoUrl`, etc.

### 2. Similar Requests
```bash
curl -X POST http://localhost:3000/api/public/lucas-organization/requests/similar \
  -H "Content-Type: application/json" \
  -d '{"title":"Export dashboard"}' | jq
```

Verificar presença de: `description`, `commentCount` em cada item.

### 3. Feedback com Votes
```bash
curl http://localhost:3000/feedbacks \
  -H "Authorization: Bearer $TOKEN" | jq '.items[0] | {votes, voterIds, commentCount}'
```

Verificar que `votes` não é `undefined` e `voterIds` está presente.

### 4. Sprint Progress
```bash
curl http://localhost:3000/engineering/sprints/sprint-10/progress \
  -H "Authorization: Bearer $TOKEN" | jq
```

Verificar estrutura com `summary`, `velocity`, `health`, `burndown`.

---

## 📊 IMPACTO ESTIMADO

### Por Prioridade

**🔴 Crítico (5 itens):**
- Tempo estimado: 8-12 horas
- Impacto: Desbloqueia funcionalidades principais
- ROI: Altíssimo

**🟡 Alto (7 itens):**
- Tempo estimado: 12-16 horas
- Impacto: Melhora significativa de UX
- ROI: Alto

**🟢 Médio (6 itens):**
- Tempo estimado: 8-12 horas
- Impacto: Polimento e refinamento
- ROI: Médio

**Total estimado:** 28-40 horas de desenvolvimento backend

---

## 🚀 PRÓXIMOS PASSOS

1. **Revisar este documento** com time de backend
2. **Priorizar itens críticos** para implementação imediata
3. **Criar tickets** no backlog para cada item
4. **Atualizar OpenAPI spec** conforme implementações
5. **Validar** com testes de integração frontend-backend

---

## 📞 CONTATO

Para dúvidas sobre este documento ou sobre contratos de API:
- Frontend: Verificar arquivos em `lib/services/*`
- Tipos: `lib/types/domain.ts`, `lib/public-portal/types.ts`
- Testes: Arquivos `.integration.test.ts`

---

**Última Atualização:** 17 de Abril, 2026  
**Versão:** 1.0  
**Mantido por:** Equipe de Engenharia FAU
