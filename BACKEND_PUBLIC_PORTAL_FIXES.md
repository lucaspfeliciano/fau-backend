# Backend Public Portal - Ajustes Necessários

> **⚠️ NOTA:** Este documento foca em problemas do Public Portal.  
> **Para auditoria completa de TODAS as rotas da aplicação, veja:**  
> - **[BACKEND_API_AUDIT_COMPLETE.md](BACKEND_API_AUDIT_COMPLETE.md)** - Análise completa (80+ rotas)
> - **[BACKEND_API_QUICK_SUMMARY.md](BACKEND_API_QUICK_SUMMARY.md)** - Resumo executivo (Top 5)

---

## ⚠️ PROBLEMAS ENCONTRADOS

### 1. Rota: `GET /api/public/workspaces/:workspaceSlug/settings`

**Status Atual:** ✅ Funcionando, mas retorna campos insuficientes

**Resposta Atual:**
```json
{
  "workspaceSlug": "lucas-organization",
  "widgetApiKey": "wk_da7017b6640c4dee8a88666738adedab"
}
```

**Resposta Esperada:**
```json
{
  "workspaceSlug": "lucas-organization",
  "workspaceName": "Lucas Organization",
  "logoUrl": "https://example.com/logo.png",
  "subtitle": "Building amazing products",
  "publicPortalEnabled": true,
  "publicRoadmapEnabled": true,
  "publicChangelogEnabled": true,
  "widgetEnabled": false,
  "widgetApiKey": "wk_da7017b6640c4dee8a88666738adedab",
  "updatedAt": "2026-04-17T10:30:00.000Z"
}
```

**Campos Faltantes:**
- `workspaceName` - Nome exibido do workspace
- `logoUrl` - URL do logo (opcional)
- `subtitle` - Subtítulo do portal (opcional)
- `publicPortalEnabled` - Flag se portal público está habilitado
- `publicRoadmapEnabled` - Flag se roadmap público está habilitado
- `publicChangelogEnabled` - Flag se changelog público está habilitado
- `widgetEnabled` - Flag se widget está habilitado
- `updatedAt` - Data de última atualização

**Impacto:**
- Frontend usa `workspaceName?.trim()` e quebra com `undefined`
- Não consegue verificar se features estão habilitadas
- Não exibe logo nem subtítulo customizados

**Prioridade:** 🔴 **ALTA**

---

### 2. Rota: `POST /api/public/:workspaceSlug/requests/similar`

**Status Atual:** ⚠️ Retorno incompleto

**Tipo Frontend Atual:**
```typescript
export type PublicSimilarRequest = {
  requestId: string;
  title: string;
  status: RequestStatus;
  votes: number;
  similarityScore: number;
  actionSuggested: "vote" | "create";
};
```

**Resposta Real do Backend:**
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

**Problema:**
O frontend tenta acessar campos que NÃO existem no tipo:
- `item.id` → Deveria ser `item.requestId`
- `item.description` → **NÃO EXISTE**
- `item.commentCount` → **NÃO EXISTE**

**Solução Recomendada - Backend:**

Adicionar campos ao retorno de `PublicSimilarRequest`:

```typescript
{
  "items": [
    {
      "requestId": "req-123",
      "title": "Export dashboard by squad",
      "description": "Users need to filter by squad before exporting",  // NOVO
      "status": "Planned",
      "votes": 15,
      "commentCount": 3,  // NOVO
      "similarityScore": 0.85,
      "actionSuggested": "vote"
    }
  ]
}
```

**Impacto:**
- UI de "Similar requests found" quebra com erro `Cannot read properties of undefined (reading 'id')`
- Não exibe descrição nem contador de comentários nas sugestões

**Prioridade:** 🔴 **ALTA**

---

### 3. Rota: `POST /ai/requests/import-notes`

**Status Atual:** ❌ Erro 400 - Validação incorreta

**Payload Frontend Atual:**
```json
{
  "content": "Customer asked for dashboard export by squad",
  "source": "manual"
}
```

**Payload Esperado pelo Backend:**
```json
{
  "text": "Customer asked for dashboard export by squad",
  "sourceType": "meeting-notes"
}
```

**Problema:**
- Campo `content` deveria ser `text`
- Campo `source` deveria ser `sourceType`
- Valores aceitos para `sourceType`:
  - `"meeting-notes"`
  - `"sales-conversation"`
  - `"slack-message"`
  - `"fireflies-transcript"`

**Solução Aplicada - Frontend:**
✅ Já corrigido em `lib/types/domain.ts` e `app/ai/page.tsx`

**Status:** ✅ **RESOLVIDO** (frontend)

---

## 📋 Resumo de Ações

### Para o Backend:

1. **Rota `/api/public/workspaces/:slug/settings` (GET):**
   - ✅ Adicionar campos: `workspaceName`, `logoUrl`, `subtitle`
   - ✅ Adicionar flags: `publicPortalEnabled`, `publicRoadmapEnabled`, `publicChangelogEnabled`, `widgetEnabled`
   - ✅ Adicionar campo: `updatedAt`

2. **Rota `/api/public/:slug/requests/similar` (POST):**
   - ✅ Adicionar campo `description` nos itens retornados
   - ✅ Adicionar campo `commentCount` nos itens retornados
   - 🔶 Considerar adicionar `id` como alias de `requestId` para consistência

3. **Validação de tipos:**
   - ✅ Garantir que todas as rotas públicas retornem objetos consistentes
   - ✅ Documentar estruturas de retorno no OpenAPI

### Para o Frontend:

✅ Campos tornados opcionais em `PublicPortalSettings`
✅ Proteções com optional chaining adicionadas
✅ Tipo `ImportNotesPayload` corrigido
⏳ Aguardando ajustes do backend para remover fallbacks temporários

---

## 🧪 Como Testar

### 1. Settings:
```bash
curl http://localhost:3000/api/public/workspaces/lucas-organization/settings
```

**Deve retornar:**
```json
{
  "workspaceSlug": "lucas-organization",
  "workspaceName": "Lucas Organization",
  "publicPortalEnabled": true,
  "publicRoadmapEnabled": true,
  "publicChangelogEnabled": true,
  "widgetEnabled": false,
  "widgetApiKey": "wk_...",
  "updatedAt": "2026-04-17T..."
}
```

### 2. Similar Requests:
```bash
curl -X POST http://localhost:3000/api/public/lucas-organization/requests/similar \
  -H "Content-Type: application/json" \
  -d '{"title":"Export dashboard by squad"}'
```

**Deve retornar:**
```json
{
  "items": [
    {
      "requestId": "req-123",
      "title": "Export dashboard by squad",
      "description": "Users need to filter...",
      "status": "Planned",
      "votes": 15,
      "commentCount": 3,
      "similarityScore": 0.85,
      "actionSuggested": "vote"
    }
  ]
}
```

---

## ⚡ Impacto nos Usuários

### Sem os Ajustes:
- ❌ Portal público quebra com erro "Cannot read properties of undefined"
- ❌ Não exibe nome/logo customizado do workspace
- ❌ Similar requests não exibem descrição
- ❌ Não verifica se features estão habilitadas

### Com os Ajustes:
- ✅ Portal público funciona completamente
- ✅ Branding customizado (nome, logo, subtítulo)
- ✅ Similar requests com informações completas
- ✅ Controle de features públicas habilitadas

---

## 📅 Prioridade

**CRÍTICO:** Itens 1 e 2 bloqueiam funcionalidade do portal público.

**Sugestão:** Implementar em Sprint atual para desbloquear lançamento do portal público.
