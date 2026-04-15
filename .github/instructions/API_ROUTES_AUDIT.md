# 📋 Auditoria Completa das Rotas Backend - FAU Platform

**Data da Auditoria:** 14 de Abril de 2026  
**Versão:** 1.0  
**Status:** ✅ Completo

---

## 📊 Resumo Executivo

| Métrica               | Valor      |
| --------------------- | ---------- |
| **Total de Rotas**    | 91         |
| **GET**               | 46 (50.5%) |
| **POST**              | 31 (34%)   |
| **PATCH**             | 10 (11%)   |
| **DELETE**            | 4 (4.5%)   |
| **PUT**               | 1 (1%)     |
| **Services Frontend** | 22         |
| **Domínios de API**   | 20         |

---

## 🗂️ Rotas por Domínio

### 1. Autenticação & Usuários

#### Auth Service

- `POST /auth/google` - Login Google (googleId, name, email)
- `GET /auth/me` - Dados usuário autenticado
- `GET /organizations/me` - Organização atual

#### Organization Service

- `POST /organizations` - Criar organização (name)

#### User Service

- `GET /users` - Listar usuários
- `PATCH /users/{userId}/role` - Atualizar role (Admin/Editor/Viewer)

---

### 2. Requests (Central)

#### Request Service

- `GET /requests` - Listar com filtros avançados
  - **Query params:** search, status, boardId, owner, tag, companyId, segment, fromDate, toDate, sortBy, sortOrder, page, pageSize
- `GET /boards` - Listar boards de requests
- `GET /requests/views` - Listar saved views (fallback: `/roadmap/views`)
- `POST /requests/views` - Criar view (name, preferences, isDefault)
- `PATCH /requests/views/{viewId}` - Atualizar view
- `DELETE /requests/views/{viewId}` - Deletar view

---

### 3. Roadmap

#### Roadmap Service

- `GET /roadmap/items` - Listar items do roadmap
  - **Query params:** search, status, board, category, audience, etaConfidence, sortBy, sortOrder
- `GET /roadmap/items/{requestId}` - Detalhes do item
- `GET /roadmap/items/{requestId}/overview` - Overview detalhado
- `GET /roadmap/items/{requestId}/traceability` - Rastreabilidade completa
- `POST /roadmap/telemetry/events` - Registrar telemetria
  - **Body:** event type, audience, viewId, elapsedMs, metadata
  - **Fallback:** `/analytics/events`
- `GET /roadmap/views` - Listar saved views
- `POST /roadmap/views` - Criar view (name, preferences, isDefault)
- `PATCH /roadmap/views/{viewId}` - Atualizar view
- `DELETE /roadmap/views/{viewId}` - Deletar view

---

### 4. Product (Features & Initiatives)

#### Initiative Service

- `GET /product/initiatives` - Listar initiatives
- `GET /product/initiatives/{id}` - Detalhes da initiative
- `POST /product/initiatives` - Criar initiative (name, description)
  - **⚠️ Retry automático** em caso de 400/404/422 com payload legado
- `PATCH /product/initiatives/{id}` - Atualizar (name, description, status)
  - **⚠️ Retry automático** em caso de 400/404/422

#### Feature Service

- `GET /product/features` - Listar features
- `GET /product/initiatives/{initiativeId}/features` - Features por initiative
- `GET /product/features/{id}` - Detalhes da feature
- `POST /product/features` - Criar feature
  - **Body:** title, description, priority, initiativeId
- `PATCH /product/features/{id}` - Atualizar feature
- `POST /product/features/{featureId}/requests/{requestId}` - Linkar request à feature
- `DELETE /product/features/{featureId}/requests/{requestId}` - Deslinkar request
- `GET /product/features/{featureId}/traceability` - Rastreabilidade da feature

---

### 5. Engineering (Sprints & Tasks)

#### Sprint Service

- `GET /engineering/sprints` - Listar sprints
- `GET /engineering/sprints/{id}` - Detalhes da sprint
- `POST /engineering/sprints` - Criar sprint (name, startDate, endDate)
  - **⚠️ Retry automático** em caso de 400/404/422
- `PATCH /engineering/sprints/{id}` - Atualizar (name, startDate, endDate, status)
  - **⚠️ Retry automático** em caso de 400/404/422
- `GET /engineering/sprints/{sprintId}/progress` - Progresso da sprint

#### Task Service

- `GET /engineering/tasks` - Listar todas as tasks
- `GET /engineering/sprints/{sprintId}/tasks` - Tasks de uma sprint específica
- `GET /product/features/{featureId}/tasks` - Tasks de uma feature específica
- `GET /engineering/tasks/{id}` - Detalhes da task
- `POST /engineering/tasks` - Criar task
  - **Body:** title, description, featureId, estimate
- `PATCH /engineering/tasks/{id}` - Atualizar task
  - **Body:** title, description, status, estimate, assignee, blockers[]
- `POST /engineering/tasks/{taskId}/assign-sprint/{sprintId}` - Atribuir task à sprint
- `GET /engineering/tasks/{taskId}/traceability` - Rastreabilidade da task

---

### 6. Releases & Changelog

#### Release Service

- `GET /releases` - Listar releases
- `GET /releases/{id}` - Detalhes da release
- `POST /releases` - Criar release
  - **Body:** version, title, description, features[], audience, scheduledAt, linkedRoadmapItemId
  - **⚠️ Retry automático** em caso de 400/404/422
- `PATCH /releases/{id}` - Atualizar release
  - **Body:** title, description, status, audience, scheduledAt, publishedAt, features[], linkedRoadmapItemId
  - **⚠️ Retry automático** em caso de 400/404/422
- `DELETE /releases/{id}` - Deletar release
- `POST /releases/{id}/publish` - Publicar release

#### Changelog Service

- `GET /changelog` - Listar changelog (fallback: `/changelog/public`)
- `POST /changelog` - Criar entrada (title, description, publishedAt)
- `PATCH /changelog/{id}` - Atualizar entrada
- `DELETE /changelog/{id}` - Deletar entrada

---

### 7. Playground (Discovery Workspace)

#### Playground Service

- `GET /playground/workspaces` - Listar workspaces
- `POST /playground/workspaces` - Criar workspace (workspaceId, title, description)
- `GET /playground/workspaces/{id}` - Detalhes do workspace
- `PATCH /playground/workspaces/{id}` - Atualizar (title, description)
- `DELETE /playground/workspaces/{id}` - Deletar workspace
- `GET /playground/workspaces/{workspaceId}/assets` - Listar assets
- `POST /playground/workspaces/{workspaceId}/assets` - Upload de asset
  - **⚠️ Content-Type:** `multipart/form-data`
  - **FormData fields:** file (File), name (string), type (string), mimeType (string)
- `GET /playground/workspaces/{workspaceId}/nodes` - Listar nodes do canvas
- `POST /playground/workspaces/{workspaceId}/nodes` - Criar node
  - **Body:** type, title, content, x, y, linkedAssetId, metadata
- `PATCH /playground/nodes/{nodeId}` - Atualizar node
  - **Fallback:** `/playground/workspaces/{workspaceId}/nodes/{nodeId}`
- `DELETE /playground/nodes/{nodeId}` - Deletar node
  - **Fallback:** `/playground/workspaces/{workspaceId}/nodes/{nodeId}`
- `GET /playground/workspaces/{workspaceId}/board-cards` - Listar cards de priorização
  - **Fallback:** `/playground/workspaces/{workspaceId}/cards`

---

### 8. AI & Processamento

#### AI Service

- `POST /ai/requests/import-notes` - Importar notas/transcrições
  - **Body:** ImportNotesPayload (notes, source, metadata)
- `GET /ai/quality-metrics` - Métricas de qualidade da IA
- `POST /integrations/slack/import-message` - Importar mensagem do Slack
  - **Body:** channelId, threadTs
- `POST /ai/requests/match-similar` - Encontrar requests similares
  - **Body:** text
- `GET /ai/requests/review-queue` - Listar fila de revisão de IA
- `POST /ai/requests/review-queue/{itemId}/approve` - Aprovar item da fila
- `POST /ai/requests/review-queue/{itemId}/reject` - Rejeitar item da fila
- `POST /ai/requests/review-queue/approve-batch` - Aprovar lote
  - **Body:** itemIds[]

---

### 9. Integrações

#### Integration Service

**Geral:**

- `GET /integrations/status` - Status de todas as integrações
- `GET /integrations/dashboard` - Dashboard completo de integrações
- `GET /integrations/logs` - Logs de sincronização
- `POST /integrations/logs/{logId}/retry` - Retry de log com falha
- `GET /integrations/source-of-truth/ownership` - Propriedade do Source of Truth
- `POST /integrations/reconcile` - Reconciliar dados
  - **Body:** provider, dryRun, autoResolveMissingInternal
- `POST /integrations/{type}/disconnect` - Desconectar integração (type: slack|hubspot|linear)

**Slack:**

- `POST /integrations/slack/config` - Configurar Slack (webhookUrl, defaultChannel)
- `POST /integrations/slack/sync-events` - Sincronizar eventos

**HubSpot:**

- `POST /integrations/hubspot/sync` - Sincronizar HubSpot

**Linear:**

- `POST /integrations/linear/sync` - Sincronizar Linear
- `GET /integrations/linear/status-mapping` - Obter mapeamento de status
- `PUT /integrations/linear/status-mapping` - Atualizar mapeamento (items[])

**Fireflies:**

- `GET /integrations/fireflies/config` - Obter configuração
- `POST /integrations/fireflies/config` - Configurar (workspaceId, projectId)
- `POST /integrations/fireflies/import-transcript` - Importar transcrição

---

### 10. Companies & Customers

#### Company Service

- `GET /companies` - Listar companies
- `POST /companies` - Criar company (name, revenue)
- `GET /companies/{id}` - Detalhes da company
- `PATCH /companies/{id}` - Atualizar company

#### Customer Service

- `GET /customers` - Listar customers
- `POST /customers` - Criar customer (name, email, companyId)
- `GET /customers/{id}` - Detalhes do customer
- `PATCH /customers/{id}` - Atualizar customer

---

### 11. Teams

#### Team Service

- `GET /teams` - Listar teams
- `POST /teams` - Criar team (name)
- `PATCH /teams/{id}` - Atualizar team (name)

---

### 12. Notificações

#### Notification Service

- `GET /notifications` - Listar notificações do usuário
- `GET /notifications/preferences?teamId={id}` - Obter preferências de notificação
- `POST /notifications/preferences` - Atualizar preferências
  - **Body:** teamId, notificationType, channels[], enabled
- `POST /notifications/{notificationId}/read` - Marcar como lida

---

### 13. Analytics & Auditoria

#### Analytics Service

- `GET /analytics/adoption` - Relatório de adoção
  - **Query params:** startDate, endDate

#### Audit Service

- `POST /audit/events` - Criar evento de auditoria
  - **Body:** action, description, severity, metadata
  - **Fallback:** `/analytics/events`
- `GET /audit/events` - Listar eventos de auditoria

#### Health Service

- `GET /health/events` - Eventos de saúde do sistema

---

### 14. Portal Público

#### Public Portal Service

**⚠️ Implementação:** Usa `fetch()` direto, não `apiRequest()`  
**⚠️ Autenticação:** Rotas públicas, não requerem token

**Configurações:**

- `GET /api/public/workspaces/{slug}/settings` - Obter configurações públicas
- `PATCH /api/public/workspaces/{slug}/settings` - Atualizar configurações
  - **Body:** rotateWidgetApiKey

**Requests:**

- `GET /api/public/workspaces/{slug}/requests` - Listar requests públicos
  - **Query params:** search, status
- `POST /api/public/workspaces/{slug}/requests/similar` - Buscar similares (title)
- `POST /api/public/workspaces/{slug}/requests` - Criar request público
  - **Body:** name, email, title, description
- `GET /api/public/workspaces/{slug}/requests/{requestId}` - Detalhes do request
- `GET /api/public/workspaces/{slug}/requests/{requestId}/comments` - Listar comentários
- `POST /api/public/workspaces/{slug}/requests/{requestId}/comments` - Criar comentário
  - **Body:** name, text
- `POST /api/public/workspaces/{slug}/requests/{requestId}/vote` - Registrar voto
  - **Body:** visitorId

**Roadmap & Changelog:**

- `GET /api/public/workspaces/{slug}/roadmap` - Roadmap público
- `GET /api/public/workspaces/{slug}/changelog` - Changelog público

---

## ⚠️ Observações Críticas

### 1. Autenticação & Segurança

- ✅ **Rotas protegidas:** Todas exceto `/api/public/*` requerem `Authorization: Bearer {token}`
- ✅ **Token source:** Obtido via `/auth/google` ou `/auth/me`
- ⚠️ **Portal público:** Rotas `/api/public/*` funcionam sem autenticação

### 2. Content-Type Especial

- ⚠️ **Upload de assets:** `/playground/workspaces/{workspaceId}/assets` requer `multipart/form-data`
- ✅ **Demais rotas:** Usam `application/json`

### 3. Fallback Endpoints

Rotas com fallback automático quando a primeira falha:

| Rota Principal                            | Fallback                                          |
| ----------------------------------------- | ------------------------------------------------- |
| `/requests/views`                         | `/roadmap/views`                                  |
| `/changelog`                              | `/changelog/public`                               |
| `/playground/nodes/{id}`                  | `/playground/workspaces/{workspaceId}/nodes/{id}` |
| `/playground/workspaces/{id}/board-cards` | `/playground/workspaces/{id}/cards`               |
| `/audit/events`                           | `/analytics/events`                               |
| `/roadmap/telemetry/events`               | `/analytics/events`                               |

### 4. Retry Automático

Services com **retry automático** usando payload legado (códigos 400/404/422):

- ✅ `initiative-service.ts` - POST/PATCH initiatives
- ✅ `sprint-service.ts` - POST/PATCH sprints
- ✅ `release-service.ts` - POST/PATCH releases

### 5. Implementações Não-Padronizadas

- ⚠️ **public-portal-service.ts:** Usa `fetch()` direto ao invés de `apiRequest()`
  - Não passa pela camada de erro tracking padrão
  - Não usa `API_BASE_URL` do api-client

### 6. Paginação

Rotas com suporte a paginação:

- `GET /requests` - Query params: `page`, `pageSize`
- `GET /roadmap/items` - Paginação implícita nos filtros

### 7. Configuração de Base URL

- **Variável de ambiente:** `NEXT_PUBLIC_API_BASE_URL`
- **Fallback:** `http://localhost:3000`
- **Definido em:** `lib/http/api-client.ts`

---

## ✅ Checklist de Validação Backend

### Implementação Obrigatória

- [ ] Todas as 91 rotas implementadas
- [ ] Autenticação JWT em rotas privadas
- [ ] Endpoints públicos sem validação de token
- [ ] Suporte a `multipart/form-data` em upload de assets
- [ ] CORS configurado para portal público

### Estrutura de Response

- [ ] Respostas sempre em JSON (exceto uploads)
- [ ] Campo `message` em respostas de erro
- [ ] Estrutura consistente entre rota principal e fallback
- [ ] Status HTTP corretos (401, 403, 404, 422, 500)

### Query Parameters

- [ ] Suporte a filtros em `/requests` (search, status, boardId, owner, tag, companyId, segment, dates, sort)
- [ ] Suporte a filtros em `/roadmap/items` (search, status, board, category, audience, etaConfidence, sort)
- [ ] Paginação em rotas de listagem

### Validação de Payload

- [ ] Validação de campos obrigatórios
- [ ] Mensagens de erro descritivas
- [ ] Suporte a campos opcionais documentados

### Performance

- [ ] Índices em campos filtráveis
- [ ] Paginação eficiente
- [ ] Cache de dados públicos (roadmap, changelog)

---

## 📈 Distribuição de Rotas por Categoria

```
Requests & Roadmap:     15 rotas (16.5%)
Product:                11 rotas (12.1%)
Engineering:            13 rotas (14.3%)
Playground:             11 rotas (12.1%)
Portal Público:         11 rotas (12.1%)
Integrações:            17 rotas (18.7%)
AI & Processamento:      8 rotas (8.8%)
Auth & Usuários:         6 rotas (6.6%)
Outros:                  8 rotas (8.8%)
```

---

## 🔄 Endpoints com Múltiplas Versões

Alguns endpoints têm variações de caminho que devem ser suportadas:

1. **Views de Roadmap/Requests:**
   - `/requests/views` (preferido)
   - `/roadmap/views` (fallback)

2. **Nodes do Playground:**
   - `/playground/nodes/{id}` (preferido)
   - `/playground/workspaces/{workspaceId}/nodes/{id}` (fallback)

3. **Cards do Playground:**
   - `/playground/workspaces/{id}/board-cards` (preferido)
   - `/playground/workspaces/{id}/cards` (fallback)

4. **Changelog:**
   - `/changelog` (preferido)
   - `/changelog/public` (fallback)

---

## 📝 Notas de Desenvolvimento

### Base de Código

- **Api Client:** `lib/http/api-client.ts`
- **Services:** `lib/services/` (22 arquivos)
- **Error Tracking:** Integrado via `lib/monitoring/frontend-monitor.ts`

### Convenções

- Todos os services exportam funções assíncronas
- Uso consistente de `apiRequest<TResponse>()` helper
- Type safety completo com TypeScript
- Error handling padronizado via `ApiError`

### Testes

- Services com testes de integração:
  - `ai-service.integration.test.ts`
  - `request-service.integration.test.ts`
  - `roadmap-service.integration.test.ts`
  - `delivery-chain-regression.integration.test.ts`
  - `role-workflows.integration.test.ts`

---

**Fim da Auditoria**  
Para dúvidas ou validações adicionais, consulte os arquivos de service em `lib/services/`.
