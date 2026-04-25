# Backend API - Resumo Executivo de Ajustes

**Data:** 17 de Abril, 2026  
**Documento Completo:** `BACKEND_API_AUDIT_COMPLETE.md`

---

## 🎯 Top 5 - Implementar AGORA

### 1. 🔴 Public Portal Settings - Campos Críticos Faltando
```diff
GET /api/public/workspaces/:slug/settings

Resposta Atual:
{
  "workspaceSlug": "...",
  "widgetApiKey": "..."
}

+ Adicionar:
+ "workspaceName": "Lucas Organization",
+ "publicPortalEnabled": true,
+ "publicRoadmapEnabled": true,
+ "publicChangelogEnabled": true,
+ "widgetEnabled": false,
+ "logoUrl": "https://...",
+ "subtitle": "...",
+ "updatedAt": "2026-04-17..."
```
**Impacto:** Portal público quebra sem esses campos  
**Tempo:** 2-3h

---

### 2. 🔴 Similar Requests - Adicionar Description + CommentCount
```diff
POST /api/public/:slug/requests/similar

Resposta Atual:
{
  "items": [{
    "requestId": "req-123",
    "title": "...",
    "status": "Planned",
    "votes": 15,
    "similarityScore": 0.85,
    "actionSuggested": "vote"
  }]
}

+ Adicionar em cada item:
+ "id": "req-123",              // alias de requestId
+ "description": "Users need...",
+ "commentCount": 3
```
**Impacto:** UI quebra com erro "Cannot read properties of undefined"  
**Tempo:** 1-2h

---

### 3. 🔴 Feedbacks - Garantir Votes Sempre Presente
```diff
GET /feedbacks

Resposta Atual (às vezes):
{
  "items": [{
    "id": "fb-123",
    "title": "...",
-   "votes": undefined  // ❌ Problema
  }]
}

Corrigir para:
{
  "items": [{
    "id": "fb-123",
    "title": "...",
+   "votes": 0,          // ✅ Sempre presente (default 0)
+   "voterIds": [],      // Adicionar também
+   "commentCount": 0    // Adicionar também
  }]
}
```
**Impacto:** Contadores não funcionam  
**Tempo:** 1h

---

### 4. 🟡 Roadmap Items - Padronizar Resposta
```diff
GET /roadmaps/items

❌ NÃO retornar array direto:
- RoadmapItem[]

✅ Sempre retornar objeto:
{
  "items": RoadmapItem[],
  "total": 156,
  "page": 1,
  "pageSize": 20
}
```
**Impacto:** Frontend tem código defensivo desnecessário  
**Tempo:** 1h

---

### 5. 🟡 Tasks - Incluir Nome do Assignee
```diff
GET /engineering/tasks

Resposta Atual:
{
  "items": [{
    "id": "task-123",
    "title": "...",
    "assigneeId": "usr-456"  // Só o ID
  }]
}

Melhorar para:
{
  "items": [{
    "id": "task-123",
    "title": "...",
+   "assignee": {
+     "id": "usr-456",
+     "name": "Alice Johnson",
+     "email": "alice@example.com"
+   }
  }]
}
```
**Impacto:** UI precisa mostrar nomes, não IDs  
**Tempo:** 2h

---

## 📊 Resumo por Categoria

| Categoria | Crítico | Alto | Médio | Total |
|-----------|---------|------|-------|-------|
| Public Portal | 2 | 2 | 0 | 4 |
| Requests/Feedbacks | 1 | 2 | 1 | 4 |
| Engineering | 0 | 2 | 2 | 4 |
| Product | 0 | 1 | 2 | 3 |
| Integrations | 0 | 1 | 0 | 1 |
| Analytics | 0 | 0 | 1 | 1 |
| **TOTAL** | **5** | **7** | **6** | **18** |

---

## ⚡ Quick Wins (< 2h cada)

1. ✅ Adicionar `commentCount` em listas de feedbacks/requests
2. ✅ Garantir `votes` nunca `undefined` (default 0)
3. ✅ Padronizar arrays → objetos com `{items: [], total: n}`
4. ✅ Adicionar `id` como alias de `requestId` em PublicSimilarRequest
5. ✅ Incluir `hasUserVoted` boolean quando contexto autenticado

---

## 🧪 Como Validar

### Teste 1 - Settings Completos
```bash
curl http://localhost:3000/api/public/workspaces/lucas-organization/settings | \
  jq '{workspaceName, publicPortalEnabled}'
```
**Esperado:** Ambos os campos presentes

### Teste 2 - Similar Requests
```bash
curl -X POST http://localhost:3000/api/public/lucas-organization/requests/similar \
  -H "Content-Type: application/json" \
  -d '{"title":"Export"}' | \
  jq '.items[0] | {description, commentCount}'
```
**Esperado:** Ambos os campos presentes

### Teste 3 - Feedbacks com Votes
```bash
curl http://localhost:3000/feedbacks \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.items[] | select(.votes == null)'
```
**Esperado:** Output vazio (nenhum item com votes null)

---

## 📈 Impacto x Esforço

```
Alto Impacto, Baixo Esforço (FAZER PRIMEIRO):
┌─────────────────────────────────┐
│ • Similar requests description  │
│ • Votes sempre presente         │
│ • Padronizar listas            │
└─────────────────────────────────┘

Alto Impacto, Médio Esforço:
┌─────────────────────────────────┐
│ • Public Portal Settings       │
│ • Tasks com assignee info      │
│ • Sprint progress metrics      │
└─────────────────────────────────┘

Médio Impacto, Baixo Esforço:
┌─────────────────────────────────┐
│ • Boards com contadores        │
│ • Notifications agrupadas      │
│ • Customers com company inline │
└─────────────────────────────────┘
```

---

## 🎯 Sprint Recommendation

### Sprint Atual (Esta Semana)
**Foco:** Itens Críticos
- [ ] Public Portal Settings (3h)
- [ ] Similar Requests (2h)
- [ ] Feedbacks votes (1h)
**Total:** 6h

### Próxima Sprint
**Foco:** Itens de Alto Impacto
- [ ] Padronização de listas (2h)
- [ ] Tasks enrichment (2h)
- [ ] Sprint progress (3h)
- [ ] Request details optimization (2h)
**Total:** 9h

### Backlog
**Foco:** Polimento
- Contadores inline
- Traceability completa
- Analytics time series
**Total:** ~12h

---

## 📞 Ações Imediatas

1. **Backend Lead:** Revisar itens 1-5 acima
2. **PO:** Priorizar para sprint atual
3. **QA:** Preparar testes para validação
4. **DevOps:** Atualizar OpenAPI spec após implementações

---

**Ver documento completo:** [BACKEND_API_AUDIT_COMPLETE.md](BACKEND_API_AUDIT_COMPLETE.md)

**Estimativa Total:** 27-35 horas de desenvolvimento
**ROI:** Alto (desbloqueia features e melhora UX significativamente)
